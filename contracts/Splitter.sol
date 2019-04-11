pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Splitter {
    using SafeMath for uint256;

    event LogSplitterCreated(address indexed owner);
    event LogMakeSplit(address indexed beneficiary1, address indexed beneficiary2, uint256 amount,  uint256 remainder);
    event LogAmountReceived(address indexed caller, uint256 indexed amount);

    mapping(address => uint256) public balances;

    constructor() public {
        emit LogSplitterCreated(msg.sender);
    }

    /**
     * Allow any users to make its funds split
     */
    function makeSplit(address first, address second) public payable {
        require(first != address(0));
        require(second != address(0));
        require(msg.value != 0);

        uint256 remainder = msg.value.mod(2);
        uint256 half = msg.value.sub(remainder).div(2);

        balances[msg.sender] = balances[msg.sender].add(remainder);
        balances[first]      = balances[first].add(half);
        balances[second]     = balances[second].add(half);

        emit LogMakeSplit(first, second, half, remainder);
    }

    /**
     * Allow investing by just sending money to the contract address.
     */
    function () external payable {
        require(msg.value != 0);

        balances[msg.sender] = balances[msg.sender].add(msg.value);
        emit LogAmountReceived(msg.sender, msg.value);
    }
}
