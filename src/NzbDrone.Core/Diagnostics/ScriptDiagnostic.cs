using System;
using System.Diagnostics;
using Microsoft.CodeAnalysis;

namespace NzbDrone.Core.Diagnostics
{
    public class ScriptDiagnostic
    {
        public int StartLineNumber { get; private set; }
        public int StartColumn { get; private set; }
        public int EndLineNumber { get; private set; }
        public int EndColumn { get; private set; }
        public string Message { get; set; }
        public DiagnosticSeverity Severity { get; set; }
        public string FullMessage { get; set; }

        public ScriptDiagnostic(Exception ex, StackFrame frame)
        {
            StartLineNumber = EndLineNumber = frame.GetFileLineNumber();
            StartColumn = EndColumn = frame.GetFileColumnNumber();
            Message = ex.Message;
            Severity = DiagnosticSeverity.Error;
            FullMessage = ex.ToString();
        }

        public ScriptDiagnostic(Diagnostic diagnostic)
        {
            var lineSpan = diagnostic.Location.GetLineSpan();

            StartLineNumber = lineSpan.StartLinePosition.Line + 1;
            StartColumn = lineSpan.StartLinePosition.Character + 1;
            EndLineNumber = lineSpan.EndLinePosition.Line + 1;
            EndColumn = lineSpan.EndLinePosition.Character + 1;
            Message = diagnostic.GetMessage();
            Severity = diagnostic.Severity;
            FullMessage = diagnostic.ToString();
        }
    }
}
