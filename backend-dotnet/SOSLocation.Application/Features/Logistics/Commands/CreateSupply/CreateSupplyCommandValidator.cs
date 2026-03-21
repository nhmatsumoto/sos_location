using FluentValidation;

namespace SOSLocation.Application.Features.Logistics.Commands.CreateSupply
{
    public class CreateSupplyCommandValidator : AbstractValidator<CreateSupplyCommand>
    {
        private static readonly string[] AllowedStatuses = ["planejado", "em_transito", "entregue", "cancelado"];
        private static readonly string[] AllowedPriorities = ["baixa", "media", "alta", "critica"];

        public CreateSupplyCommandValidator()
        {
            RuleFor(x => x.Item)
                .NotEmpty().WithMessage("Item name is required.")
                .MaximumLength(200).WithMessage("Item name must not exceed 200 characters.");

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than zero.");

            RuleFor(x => x.Unit)
                .NotEmpty().WithMessage("Unit is required.")
                .MaximumLength(20);

            RuleFor(x => x.Origin)
                .MaximumLength(200);

            RuleFor(x => x.Destination)
                .MaximumLength(200);

            RuleFor(x => x.Status)
                .Must(s => AllowedStatuses.Contains(s))
                .WithMessage($"Status must be one of: {string.Join(", ", AllowedStatuses)}.");

            RuleFor(x => x.Priority)
                .Must(p => AllowedPriorities.Contains(p))
                .WithMessage($"Priority must be one of: {string.Join(", ", AllowedPriorities)}.");
        }
    }
}
