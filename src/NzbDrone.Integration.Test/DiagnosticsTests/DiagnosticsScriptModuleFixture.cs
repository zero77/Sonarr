using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Integration.Test.Client;
using RestSharp;
using Sonarr.Api.V3.Diagnostics;

namespace NzbDrone.Integration.Test.DiagnosticsTests
{
    public class DiagnosticsScriptClient : ClientBase<DiagnosticScriptResource>
    {
        public DiagnosticsScriptClient(IRestClient restClient, string apiKey)
            : base(restClient, apiKey, "v3/system/debug/script")
        {
        }

        public DiagnosticScriptResource Execute(DiagnosticScriptResource body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            var request = BuildRequest("execute");
            request.AddJsonBody(body);
            return Post<DiagnosticScriptResource>(request, statusCode);
        }
    }

    public class DiagnosticsScriptModuleFixture : IntegrationTest
    {
        DiagnosticsScriptClient DiagScript { get; set; }

        [SetUp]
        public void SetUp()
        {
            DiagScript = new DiagnosticsScriptClient(RestClient, ApiKey);
        }

        [Test]
        public void should_not_allow_access_without_debugscripts_dir()
        {
            var debugscripts = Path.Combine(_runner.AppData, "debugscripts");

            if (Directory.Exists(debugscripts))
            {
                Directory.Delete(debugscripts);
            }

            DiagScript.Execute(new DiagnosticScriptResource
            {
                Script = "return \"abc\";"
            }, HttpStatusCode.NotFound);
        }


        [Test]
        public void should_not_allow_access_with_debugscripts_dir()
        {
            var debugscripts = Path.Combine(_runner.AppData, "debugscripts");

            if (!Directory.Exists(debugscripts))
            {
                Directory.CreateDirectory(debugscripts);
            }

            var result = DiagScript.Execute(new DiagnosticScriptResource
            {
                Script = "return \"abc\";"
            });

            result.ReturnValue.Should().Be("abc");
        }

    }
}
