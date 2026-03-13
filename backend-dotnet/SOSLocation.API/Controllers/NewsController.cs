using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.News;
using SOSLocation.Domain.Common;
using SOSLocation.Application.DTOs.Common;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1/news")]
    [AllowAnonymous]
    public class NewsController : ControllerBase
    {
        private readonly INewsRepository _newsRepository;

        public NewsController(INewsRepository newsRepository)
        {
            _newsRepository = newsRepository;
        }

        [HttpGet]
        public async Task<ActionResult<Result<ListResponseDto<NewsNotification>>>> GetNews(
            [FromQuery] string? country = null, 
            [FromQuery] string? location = null)
        {
            var news = await _newsRepository.GetAllAsync(country, location);
            var list = new List<NewsNotification>(news);
            
            return Ok(Result<ListResponseDto<NewsNotification>>.Success(new ListResponseDto<NewsNotification>
            {
                Items = list,
                TotalCount = list.Count
            }));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Result<NewsNotification>>> GetNewsById(Guid id)
        {
            var news = await _newsRepository.GetByIdAsync(id);
            if (news == null) return NotFound(Result<NewsNotification>.Failure("News not found."));
            
            return Ok(Result<NewsNotification>.Success(news));
        }
    }
}
