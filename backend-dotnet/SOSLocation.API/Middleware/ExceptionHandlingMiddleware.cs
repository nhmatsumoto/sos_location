using System.Net;
using System.Text.Json;
using FluentValidation;
using SOSLocation.Domain.Common;

namespace SOSLocation.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred.");
                await HandleExceptionAsync(context, ex, _env.IsDevelopment());
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception, bool isDevelopment)
        {
            context.Response.ContentType = "application/json";

            object resultModel;

            if (exception is ValidationException validationEx)
            {
                context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;

                var errors = validationEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );

                resultModel = new
                {
                    success = false,
                    statusCode = StatusCodes.Status422UnprocessableEntity,
                    message = "Validation failed",
                    errors
                };
            }
            else
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                var message = isDevelopment
                    ? $"Internal Server Error: {exception.Message}"
                    : "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.";

                resultModel = Result.Failure(message, "Operation failed", (int)HttpStatusCode.InternalServerError);
            }

            var result = JsonSerializer.Serialize(
                resultModel,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            );

            return context.Response.WriteAsync(result);
        }
    }
}
