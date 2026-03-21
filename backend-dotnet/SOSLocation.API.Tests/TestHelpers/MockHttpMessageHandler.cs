using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.API.Tests.TestHelpers
{
    /// <summary>
    /// A delegating handler that intercepts HttpClient calls and returns
    /// a preconfigured response, enabling deterministic provider tests without
    /// a real network.
    /// </summary>
    public class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _responseContent;
        private readonly string _contentType;

        public int CallCount { get; private set; }
        public HttpRequestMessage? LastRequest { get; private set; }

        public MockHttpMessageHandler(
            string responseContent = "",
            HttpStatusCode statusCode = HttpStatusCode.OK,
            string contentType = "application/json")
        {
            _responseContent = responseContent;
            _statusCode = statusCode;
            _contentType = contentType;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequest = request;

            var response = new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_responseContent, Encoding.UTF8, _contentType)
            };

            return Task.FromResult(response);
        }

        /// <summary>
        /// Creates an HttpClient backed by this mock handler.
        /// </summary>
        public HttpClient CreateClient() => new HttpClient(this);
    }
}
