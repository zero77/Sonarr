using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;
using NLog;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Composition;
using NzbDrone.Common.EnvironmentInfo;

namespace NzbDrone.Core.Diagnostics
{
    public interface IDiagnosticScriptRunner
    {
        ScriptValidationResult Validate(ScriptRequest request);
        ScriptExecutionResult Execute(ScriptRequest request);
    }

    internal class CompilationContext
    {
        public HashSet<string> GlobalUsings { get; set; }
        public ScriptOptions Options { get; set; }
        public string Code { get; set; }
        public Script Script { get; set; }
        public Compilation LastCompilation { get; set; }
    }

    public class DiagnosticScriptRunner : IDiagnosticScriptRunner
    {
        private static readonly Regex _regexResolve = new Regex(@"=\s+Resolve<(I\w+)>", RegexOptions.Compiled);
        private static readonly Assembly[] _assemblies = new[] {
            typeof(AppFolderInfo).Assembly,
            typeof(DiagnosticScriptRunner).Assembly
        };

        private readonly IContainer _container;
        private readonly Logger _logger;

        private readonly ICached<ScriptState> _scriptStateCache;

        private WeakReference<CompilationContext> _lastCompilation;

        public DiagnosticScriptRunner(IContainer container, ICacheManager cacheManager, Logger logger)
        {
            _container = container;
            _logger = logger;

            _scriptStateCache = cacheManager.GetCache<ScriptState>(GetType());

            _lastCompilation = new WeakReference<CompilationContext>(null);
        }

        public ScriptValidationResult Validate(ScriptRequest request)
        {
            lock (this)
            {
                var globalUsings = GetGlobalUsings(request.Code);

                _lastCompilation.TryGetTarget(out var lastCompilation);
                
                // Swapping SyntaxTree is significantly faster and uses less memory
                if (lastCompilation != null && lastCompilation.Code == request.Code)
                {
                    // Unchanged
                }
                else if (lastCompilation != null && lastCompilation.GlobalUsings == globalUsings)
                {
                    var newSyntaxTree = CSharpSyntaxTree.ParseText(request.Code, CSharpParseOptions.Default.WithKind(SourceCodeKind.Script));

                    lastCompilation.Script = null;
                    lastCompilation.Code = request.Code;
                    lastCompilation.LastCompilation = lastCompilation.LastCompilation.ReplaceSyntaxTree(lastCompilation.LastCompilation.SyntaxTrees.First(), newSyntaxTree);
                }
                else
                {
                    var options = GetOptions(globalUsings, request.Debug);

                    var script = CSharpScript.Create(request.Code, options, globalsType: typeof(ScriptContext));

                    var compilation = script.GetCompilation();

                    lastCompilation = new CompilationContext
                    {
                        GlobalUsings = globalUsings,
                        Options = options,
                        Code = request.Code,
                        Script = script,
                        LastCompilation = compilation
                    };

                    _lastCompilation.SetTarget(lastCompilation);
                }

                var diagnostics = lastCompilation.LastCompilation.GetDiagnostics();

                return new ScriptValidationResult
                {
                    Messages = diagnostics.Select(v => new ScriptDiagnostic(v)).ToArray()
                };
            }
        }

        public ScriptExecutionResult Execute(ScriptRequest request)
        {
            if (request.StateId != null)
            {
                return ExecuteAsync(request, request.StateId).GetAwaiter().GetResult();
            }
            else
            {
                return ExecuteAsync(request).GetAwaiter().GetResult();
            }
        }

        public async Task<ScriptExecutionResult> ExecuteAsync(ScriptRequest request)
        {
            Script script;

            lock (this)
            {
                var globalUsings = GetGlobalUsings(request.Code);

                _lastCompilation.TryGetTarget(out var lastCompilation);

                if (lastCompilation != null && lastCompilation.Code == request.Code && lastCompilation.Script != null &&
                    lastCompilation.Options.EmitDebugInformation == request.Debug)
                {
                    script = lastCompilation.Script;
                }
                else
                {
                    try
                    {
                        var options = GetOptions(globalUsings, request.Debug);

                        script = CSharpScript.Create(request.Code, options, globalsType: typeof(ScriptContext));

                        var compilation = script.GetCompilation();

                        lastCompilation = new CompilationContext
                        {
                            GlobalUsings = globalUsings,
                            Options = options,
                            Code = request.Code,
                            Script = script,
                            LastCompilation = compilation
                        };

                        _lastCompilation.SetTarget(lastCompilation);
                    }
                    catch (CompilationErrorException ex)
                    {
                        return GetResult(ex);
                    }
                }
            }

            try
            {
                var state = await script.RunAsync(new ScriptContext(_container, _logger));

                return GetResult(state, request.StoreState);
            }
            catch (CompilationErrorException ex)
            {
                return GetResult(ex);
            }
            catch (Exception ex)
            {
                return GetResult(ex);
            }
        }

        public async Task<ScriptExecutionResult> ExecuteAsync(ScriptRequest request, string stateId)
        {
            var options = GetOptions(GetGlobalUsings(request.Code), request.Debug);

            var script = GetState(stateId);

            try
            {
                var state = await script.ContinueWithAsync(request.Code, options);

                return GetResult(state, request.StoreState);
            }
            catch (CompilationErrorException ex)
            {
                return GetResult(ex);
            }
            catch (Exception ex)
            {
                return GetResult(ex);
            }
        }

        private HashSet<string> GetGlobalUsings(string source)
        {
            var result = new HashSet<string>();

            // Make the syntax easier by parsing Resolve<I..> and auto add using
            var matches = _regexResolve.Matches(source);
            foreach (Match match in matches)
            {
                foreach (var ns in ResolveNamespaces(match.Groups[1].Value))
                {
                    result.Add(ns);
                }
            }

            return result;
        }

        private ScriptOptions GetOptions(HashSet<string> globalUsings, bool debug = false)
        {
            var options = ScriptOptions.Default
                .AddReferences(_assemblies)
                .AddImports(typeof(Task).Namespace)
                .AddImports(typeof(Enumerable).Namespace);

            if (debug)
            {
                options = options.WithEmitDebugInformation(true)
                                 .WithFilePath("ScriptConsole.cs")
                                 .WithFileEncoding(Encoding.UTF8);
            }

            // Make the syntax easier by parsing Resolve<I..> and auto add using
            foreach (var ns in globalUsings)
            {
                options = options.AddImports(ns);
            }

            return options;
        }

        private List<string> ResolveNamespaces(string type)
        {
            var types = _assemblies
                .SelectMany(v => v.GetTypes())
                .Where(v => v.Name == type);

            var namespaces = types.Select(v => v.Namespace)
                .Distinct()
                .ToList();

            return namespaces;
        }

        private ScriptExecutionResult GetResult(ScriptState state, bool storeState)
        {
            var variables = state.Variables.Where(v => !v.Type.IsInterface || !v.Type.Namespace.StartsWith("NzbDrone")).ToDictionary(v => v.Name, v => v.Value);

            var result = new ScriptExecutionResult
            {
                StateId = storeState ? StoreState(state) : null,
                ReturnValue = state.ReturnValue,
                Variables = variables.Any() ? variables : null
            };

            return result;
        }

        private ScriptExecutionResult GetResult(CompilationErrorException ex)
        {
            return new ScriptExecutionResult
            {
                Exception = ex,
                Validation = new ScriptValidationResult { Messages = ex.Diagnostics.Select(v => new ScriptDiagnostic(v)).ToArray() }
            };
        }

        private ScriptExecutionResult GetResult(Exception ex)
        {
            var result = new ScriptExecutionResult
            {
                Exception = ex
            };

            var stackTrace = new System.Diagnostics.StackTrace(ex, true);

            for (int i = 0; i < stackTrace.FrameCount; i++)
            {
                var frame = stackTrace.GetFrame(i);
                if (frame.GetFileName() == "ScriptConsole.cs")
                {
                    result.Validation = new ScriptValidationResult
                    {
                        Messages = new[]
                        {
                               new ScriptDiagnostic(ex, frame)
                            }
                    };
                    break;
                }
            }

            return result;
        }

        private ScriptState GetState(string stateID)
        {
            var state = _scriptStateCache.Find(stateID);

            if (state == null)
                throw new KeyNotFoundException($"ScriptState {stateID} no longer exists");

            return state;
        }

        private void RemoveState(string stateID)
        {
            _scriptStateCache.Remove(stateID);
        }

        private string StoreState(ScriptState state)
        {
            var key = Guid.NewGuid().ToString();

            _scriptStateCache.Set(key, state, TimeSpan.FromHours(1));

            return key;
        }
    }
}
