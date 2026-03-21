using FluentValidation;

namespace SOSLocation.Application.Features.Rescue.Commands.CreateSearchArea
{
    public class CreateSearchAreaCommandValidator : AbstractValidator<CreateSearchAreaCommand>
    {
        private static readonly string[] AllowedStatuses = ["Pending", "InProgress", "Completed", "Abandoned"];
        private static readonly string[] AllowedSeverities = ["Low", "Medium", "High", "Critical"];

        public CreateSearchAreaCommandValidator()
        {
            RuleFor(x => x.IncidentId)
                .NotEmpty().WithMessage("IncidentId is required.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Search area name is required.")
                .MaximumLength(180).WithMessage("Name must not exceed 180 characters.");

            RuleFor(x => x.GeometryJson)
                .NotEmpty().WithMessage("GeometryJson is required.")
                .Must(BeValidJson).WithMessage("GeometryJson must be valid JSON.");

            RuleFor(x => x.Status)
                .Must(s => AllowedStatuses.Contains(s))
                .WithMessage($"Status must be one of: {string.Join(", ", AllowedStatuses)}.");

            RuleFor(x => x.Severity)
                .Must(s => AllowedSeverities.Contains(s))
                .WithMessage($"Severity must be one of: {string.Join(", ", AllowedSeverities)}.");
        }

        private static bool BeValidJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            try
            {
                System.Text.Json.JsonDocument.Parse(json);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
