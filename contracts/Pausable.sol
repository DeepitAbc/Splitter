pragma solidity ^0.5.0;

/**
 * @title Pausable
 */
contract Pausable {
    event LogSplitterPaused(address indexed owner);
    event LogSplitterResumed(address indexed owner);

    bool private paused;

    modifier isWorking {
        require(!paused);
        _;
    }

    modifier isSuspended {
        require(paused);
        _;
    }


    constructor(bool _paused) public {
        paused = _paused;
    }


    /**
     * Pause working
     */
    function pauseInternal() internal isWorking {
        paused = true;

        emit LogSplitterPaused(msg.sender);
    }

    /**
     * Resume working
     */
    function resumeInternal() internal isSuspended {
        paused = false;

        emit LogSplitterResumed(msg.sender);
    }
}
