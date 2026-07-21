using SosLocation.Domain.Disasters;
using Xunit;

namespace SosLocation.UnitTests;

public class SimulationRunTests
{
    private static SimulationRun NewRun() => new()
    {
        CityRevisionId = Guid.NewGuid(),
        DisasterType = DisasterType.Earthquake,
        Parameters = "{}",
    };

    [Fact]
    public void Start_TransitionsToRunning_AndIncrementsAttempts()
    {
        var run = NewRun();
        run.Start("worker-1", DateTimeOffset.UtcNow);

        Assert.Equal(SimulationRunStatus.Running, run.Status);
        Assert.Equal(1, run.Attempts);
        Assert.Equal("worker-1", run.WorkerId);
        Assert.NotNull(run.StartedAt);
    }

    [Fact]
    public void Start_FromRetrying_Succeeds()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Fail("boom", DateTimeOffset.UtcNow);

        run.Start("w2", DateTimeOffset.UtcNow);

        Assert.Equal(SimulationRunStatus.Running, run.Status);
        Assert.Equal(2, run.Attempts);
    }

    [Fact]
    public void Start_DoesNotOverwriteStartedAt_OnSecondCall()
    {
        var run = NewRun();
        var firstStart = DateTimeOffset.UtcNow;
        run.Start("w", firstStart);
        run.Fail("boom", DateTimeOffset.UtcNow);

        run.Start("w2", firstStart.AddMinutes(5));

        Assert.Equal(firstStart, run.StartedAt);
    }

    [Fact]
    public void Start_WhenAlreadyRunning_Throws()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);

        Assert.Throws<InvalidOperationException>(() => run.Start("w2", DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Start_WhenCompleted_Throws()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Complete(DateTimeOffset.UtcNow);

        Assert.Throws<InvalidOperationException>(() => run.Start("w2", DateTimeOffset.UtcNow));
    }

    [Fact]
    public void AdvanceStage_UpdatesProgressAndStage()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.AdvanceStage(SimulationStage.PropagatingField, 55, "Propagating");

        Assert.Equal(SimulationStage.PropagatingField, run.CurrentStage);
        Assert.Equal(55, run.Progress);
        Assert.Equal("Propagating", run.StageMessage);
    }

    [Theory]
    [InlineData(150, 100)]
    [InlineData(-20, 0)]
    public void AdvanceStage_ClampsProgressTo0To100(int rawProgress, int expectedProgress)
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);

        run.AdvanceStage(SimulationStage.PropagatingField, rawProgress);

        Assert.Equal(expectedProgress, run.Progress);
    }

    [Fact]
    public void AdvanceStage_RequiresRunning()
    {
        var run = NewRun();
        Assert.Throws<InvalidOperationException>(() => run.AdvanceStage(SimulationStage.PropagatingField, 10));
    }

    [Fact]
    public void SetIntensityBounds_WhileRunning_SetsAllFourBounds()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);

        run.SetIntensityBounds(139.70, 35.68, 139.80, 35.75);

        Assert.Equal(139.70, run.IntensityWest);
        Assert.Equal(35.68, run.IntensitySouth);
        Assert.Equal(139.80, run.IntensityEast);
        Assert.Equal(35.75, run.IntensityNorth);
    }

    [Fact]
    public void SetIntensityBounds_RequiresRunning()
    {
        var run = NewRun();
        Assert.Throws<InvalidOperationException>(() => run.SetIntensityBounds(139.70, 35.68, 139.80, 35.75));
    }

    [Fact]
    public void SetIntensityBounds_AfterCompleted_Throws()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Complete(DateTimeOffset.UtcNow);

        Assert.Throws<InvalidOperationException>(() => run.SetIntensityBounds(139.70, 35.68, 139.80, 35.75));
    }

    [Fact]
    public void Complete_RequiresRunning()
    {
        var run = NewRun();
        Assert.Throws<InvalidOperationException>(() => run.Complete(DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Complete_SetsTerminalStageAndFullProgress()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.AdvanceStage(SimulationStage.PersistingResults, 80);

        run.Complete(DateTimeOffset.UtcNow);

        Assert.Equal(SimulationRunStatus.Completed, run.Status);
        Assert.Equal(SimulationStage.Complete, run.CurrentStage);
        Assert.Equal(100, run.Progress);
        Assert.NotNull(run.CompletedAt);
    }

    [Fact]
    public void Fail_BeforeMaxAttempts_GoesToRetrying()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Fail("boom", DateTimeOffset.UtcNow);

        Assert.Equal(SimulationRunStatus.Retrying, run.Status);
        Assert.Equal("boom", run.Error);
        Assert.Null(run.CompletedAt);
    }

    [Fact]
    public void Fail_AtMaxAttempts_GoesToFailed()
    {
        var run = NewRun();
        for (var i = 0; i < SimulationRun.MaxAttempts; i++)
        {
            run.Start("w", DateTimeOffset.UtcNow);
            run.Fail("boom", DateTimeOffset.UtcNow);
        }

        Assert.Equal(SimulationRunStatus.Failed, run.Status);
        Assert.NotNull(run.CompletedAt);
    }

    [Fact]
    public void Retry_ClearsErrorOnRestart()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Fail("boom", DateTimeOffset.UtcNow);
        run.Start("w2", DateTimeOffset.UtcNow);

        Assert.Equal(SimulationRunStatus.Running, run.Status);
        Assert.Null(run.Error);
        Assert.Equal(2, run.Attempts);
    }

    [Fact]
    public void Cancel_QueuedRun_Succeeds()
    {
        var run = NewRun();
        Assert.True(run.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(SimulationRunStatus.Cancelled, run.Status);
    }

    [Fact]
    public void Cancel_CompletedRun_Fails()
    {
        var run = NewRun();
        run.Start("w", DateTimeOffset.UtcNow);
        run.Complete(DateTimeOffset.UtcNow);

        Assert.False(run.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(SimulationRunStatus.Completed, run.Status);
    }

    [Fact]
    public void Cancel_FailedRun_Fails()
    {
        var run = NewRun();
        for (var i = 0; i < SimulationRun.MaxAttempts; i++)
        {
            run.Start("w", DateTimeOffset.UtcNow);
            run.Fail("boom", DateTimeOffset.UtcNow);
        }

        Assert.False(run.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(SimulationRunStatus.Failed, run.Status);
    }

    [Fact]
    public void Cancel_AlreadyCancelledRun_Fails()
    {
        var run = NewRun();
        run.TryCancel(DateTimeOffset.UtcNow);

        Assert.False(run.TryCancel(DateTimeOffset.UtcNow));
        Assert.Equal(SimulationRunStatus.Cancelled, run.Status);
    }
}
