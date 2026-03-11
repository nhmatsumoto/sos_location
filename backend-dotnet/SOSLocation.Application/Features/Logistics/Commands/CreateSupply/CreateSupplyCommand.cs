using MediatR;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Application.Features.Logistics.Commands.CreateSupply
{
    public record CreateSupplyCommand : IRequest<Guid>
    {
        [Required]
        public string Item { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string Unit { get; set; } = "un";
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string Status { get; set; } = "planejado";
        public string Priority { get; set; } = "media";
    }
}
