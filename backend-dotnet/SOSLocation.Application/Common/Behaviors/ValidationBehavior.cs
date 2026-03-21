using FluentValidation;
using MediatR;

namespace SOSLocation.Application.Common.Behaviors
{
    /// <summary>
    /// MediatR pipeline behavior that runs all registered FluentValidation validators
    /// for a command/query before the handler executes.
    /// Throws <see cref="ValidationException"/> if any rule fails — caught by
    /// ExceptionHandlingMiddleware and returned as HTTP 422.
    /// </summary>
    public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly IEnumerable<IValidator<TRequest>> _validators;

        public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        {
            _validators = validators;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            if (!_validators.Any())
                return await next();

            var context = new ValidationContext<TRequest>(request);

            var failures = (await Task.WhenAll(
                    _validators.Select(v => v.ValidateAsync(context, cancellationToken))))
                .SelectMany(r => r.Errors)
                .Where(f => f != null)
                .ToList();

            if (failures.Count > 0)
                throw new ValidationException(failures);

            return await next();
        }
    }
}
