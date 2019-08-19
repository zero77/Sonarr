using System.Collections.Generic;
using System.IO;
using System.Linq;
using Nancy;
using Nancy.Extensions;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Diagnostics;
using Sonarr.Http.Extensions;
using Sonarr.Http.REST;

namespace Sonarr.Api.V3.Diagnostics
{
    public class ScriptRunnerModule : SonarrV3Module
    {
        private readonly IDiagnosticScriptRunner _scriptRunner;
        private readonly IDiagnosticFeatureSwitches _featureSwitches;

        public ScriptRunnerModule(IDiagnosticScriptRunner scriptRunner, IDiagnosticFeatureSwitches featureSwitches)
            : base("diagnostic/script")
        {
            _scriptRunner = scriptRunner;
            _featureSwitches = featureSwitches;

            Post["/validate"] = ValidateScript;
            Post["/execute"] = ExecuteScript;
        }

        private ScriptRequest ParseRequest()
        {
            if (Request.Headers.ContentType == "application/json")
            {
                return Request.Body.FromJson<ScriptRequest>();
            }
            else if (Request.Headers.ContentType == "text/plain")
            {
                return new ScriptRequest { Code = Context.Request.Body.AsString() };
            }
            else
            {
                return Request.Body.FromJson<ScriptRequest>();
            }
        }

        public Response ValidateScript(dynamic options)
        {
            if (!_featureSwitches.ScriptConsoleEnabled)
            {
                return new NotFoundResponse();
            }

            var request = ParseRequest();

            var result = _scriptRunner.Validate(request);

            return new
            {
                ErrorDiagnostics = result.Messages?.ToArray()
            }.AsResponse();
        }

        public Response ExecuteScript(dynamic options)
        {
            if (!_featureSwitches.ScriptConsoleEnabled)
            {
                return new NotFoundResponse();
            }

            var request = ParseRequest();

            var result = _scriptRunner.Execute(request);

            return new
            {
                ResultStateId = result.StateId,
                ReturnValue = result.ReturnValue,
                DebugVariables = request.Debug ? result.Variables : null,
                Error = result.Exception?.Message,
                ErrorDiagnostics = result.Validation?.Messages?.ToArray()
            }.AsResponse();
        }
    }
}
