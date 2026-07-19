using SosLocation.Domain.Cities;
using SosLocation.Domain.Jobs;
using Xunit;

namespace SosLocation.UnitTests;

public class ImportJobTests
{
    private static ImportJob NewJob() => new() { JobType = "test-import", Request = "{}" };

    [Fact]
    public void Start_TransitionsToRunning_AndIncrementsAttempts()
    {
        var job = NewJob();
        job.Start("worker-1", DateTimeOffset.UtcNow);

        Assert.Equal(JobStatus.Running, job.Status);
        Assert.Equal(1, job.Attempts);
        Assert.Equal("worker-1", job.WorkerId);
        Assert.NotNull(job.StartedAt);
    }

    [Fact]
    public void AdvanceStage_UpdatesProgressAndStage()
    {
        var job = NewJob();
        job.Start("w", DateTimeOffset.UtcNow);
        job.AdvanceStage(ImportStage.Normalize, 55, "Normalizing");

        Assert.Equal(ImportStage.Normalize, job.CurrentStage);
        Assert.Equal(55, job.Progress);
        Assert.Equal("Normalizing", job.StageMessage);
    }

    [Fact]
    public void Fail_BeforeMaxAttempts_GoesToRetrying()
    {
        var job = NewJob();
        job.Start("w", DateTimeOffset.UtcNow);
        job.Fail("boom", DateTimeOffset.UtcNow);

        Assert.Equal(JobStatus.Retrying, job.Status);
        Assert.Equal("boom", job.Error);
        Assert.Null(job.CompletedAt);
    }

    [Fact]
    public void Fail_AtMaxAttempts_GoesToFailed()
    {
        var job = NewJob();
        for (var i = 0; i < ImportJob.MaxAttempts; i++)
        {
            job.Start("w", DateTimeOffset.UtcNow);
            job.Fail("boom", DateTimeOffset.UtcNow);
        }

        Assert.Equal(JobStatus.Failed, job.Status);
        Assert.NotNull(job.CompletedAt);
    }

    [Fact]
    public void Retry_ClearsErrorOnRestart()
    {
        var job = NewJob();
        job.Start("w", DateTimeOffset.UtcNow);
        job.Fail("boom", DateTimeOffset.UtcNow);
        job.Start("w2", DateTimeOffset.UtcNow);

        Assert.Equal(JobStatus.Running, job.Status);
        Assert.Null(job.Error);
        Assert.Equal(2, job.Attempts);
    }

    [Fact]
    public void Cancel_QueuedJob_Succeeds()
    {
        var job = NewJob();
        Assert.True(job.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(JobStatus.Cancelled, job.Status);
    }

    [Fact]
    public void Cancel_CompletedJob_Fails()
    {
        var job = NewJob();
        job.Start("w", DateTimeOffset.UtcNow);
        job.Complete(DateTimeOffset.UtcNow);

        Assert.False(job.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(JobStatus.Completed, job.Status);
    }

    [Fact]
    public void Complete_RequiresRunning()
    {
        var job = NewJob();
        Assert.Throws<InvalidOperationException>(() => job.Complete(DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Revision_PublishFlow_IsIdempotent()
    {
        var revision = new CityRevision
        {
            CityId = Guid.NewGuid(),
            RevisionNumber = 1,
            ReconstructionProfile = "osm-basic-v1",
        };

        revision.MarkProcessing();
        revision.MarkReady();
        revision.Publish(DateTimeOffset.UtcNow);
        var publishedAt = revision.PublishedAt;

        // Publicar de novo não altera o instante de publicação.
        revision.Publish(DateTimeOffset.UtcNow.AddMinutes(5));
        Assert.Equal(publishedAt, revision.PublishedAt);
        Assert.Equal(CityRevisionStatus.Published, revision.Status);
    }

    [Fact]
    public void Revision_CannotPublishFromDraft()
    {
        var revision = new CityRevision
        {
            CityId = Guid.NewGuid(),
            RevisionNumber = 1,
            ReconstructionProfile = "osm-basic-v1",
        };

        Assert.Throws<InvalidOperationException>(() => revision.Publish(DateTimeOffset.UtcNow));
    }
}
