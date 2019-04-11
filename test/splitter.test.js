"use strict";

// Import the third-party libraries
const Promise = require("bluebird");

if (typeof web3.eth.getBlockPromise !== 'function') {
  Promise.promisifyAll(web3.eth, {
    suffix: 'Promise',
  });
}

web3.eth.expectedExceptionPromise   = require("../utils/expectedExceptionPromise.js");
web3.eth.getEventsPromise           = require("../utils/getEventsPromise.js");
web3.eth.getFirstAccountPromise     = require("../utils/getFirstAccountPromise.js");
web3.eth.promisifyWeb3              = require("../utils/promisifyWeb3.js");
web3.eth.sequentialPromise          = require("../utils/sequentialPromise.js");
web3.eth.getTransactionReceiptMined = require('../utils/getTransactionReceiptMined.js');



require('chai')
    .use(require('chai-as-promised'))
    .use(require('bn-chai')(web3.utils.BN))
    .should();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Import the smart contracts
const Splitter       = artifacts.require('Splitter.sol');

contract('Splitter', function(accounts) {
    const MAX_GAS               = 4700000;


    let owner, user1, user2, user3;
    before("checking accounts", async function() {
        assert.isAtLeast(accounts.length, 4, "not enough accounts");

        [owner, user1, user2, user3] = accounts;
    });    

    describe('#Splitter()', async function() {

        describe('Test methods', async function() {
            let instance;

            describe("#constructor()", async function() {
                it("verify event constructor", async function() {
                   instance = await Splitter.new( { from: owner , gas: MAX_GAS}).should.be.fulfilled;
                   const receipt = await web3.eth.getTransactionReceiptMined(instance.transactionHash);
                   receipt.logs.length.should.be.equal(1);
                   const logEventSplitterCreated = receipt.logs[0];
                   logEventSplitterCreated.topics[0].should.be.equal(web3.utils.sha3('LogSplitterCreated(address)'));
                });
            });

            beforeEach("should deploy Splitter instance",  async function() {

                instance = await Splitter.new( { from: owner , gas: MAX_GAS}).should.be.fulfilled;
                let splitterBalance  = await web3.eth.getBalance(instance.address);
                assert.isTrue(splitterBalance == 0);
            });


            describe("#makeSplit()", async function() {
                it("should fail if first beneficiary address is zero", async function() {

                  const amount           = web3.utils.toWei('0.0000001', 'ether');

                  await web3.eth.expectedExceptionPromise(
                     function() {
                        return instance.makeSplit(ZERO_ADDRESS, user3, { from: user1, gas: MAX_GAS, value: amount });
                     },
                      MAX_GAS
                    );
                });

                it("should fail if beneficiary2 address is zero", async function() {
                  const amount           = web3.utils.toWei('0.0000001', 'ether');

                  await web3.eth.expectedExceptionPromise(
                     function() {
                       return instance.makeSplit(user3, ZERO_ADDRESS, { from: user1, gas: MAX_GAS, value: amount });
                     },
                     MAX_GAS
		  );
               });

               it("should fail if amount is zero",  async function() {
                 await web3.eth.expectedExceptionPromise(
                    function() {
                       return instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 0 });
                    },
                   MAX_GAS
                 );
               });
 
               [1, 10, 11, 100, 101, 1000001, 1000000002, 1000101].forEach(weiAmount => {
                 it(`should makeSplit ${weiAmount} wei between beneficiaries`, async function() {

                    const remainder = weiAmount % 2;
                    const half = (weiAmount - remainder) / 2;

                    await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: weiAmount });
                    let payerBalance = await instance.balances(user1);  
                    assert.equal(payerBalance.toString(), remainder.toString(), "payer balance not equal to amount");
                    let beneficiary1Balance = await instance.balances(user2);
                    assert.equal(beneficiary1Balance.toString(), half.toString(), "first beneficiary balance is wrong");
                    let beneficiary2Balance = await instance.balances(user3);
                    assert.equal(beneficiary2Balance.toString(), half.toString(), "second beneficiary balance is wrong");
                 });
              });

              it("verify the emitted event",  async function() {
                const amount           = web3.utils.toWei('0.0000001', 'ether');

                const result = await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: amount })
                .should.be.fulfilled;
                assert.equal(result.logs.length, 1);
                let logEvent = result.logs[0];

                assert.equal(logEvent.event, "LogMakeSplit", "LogMakeSplit name is wrong");
                assert.equal(logEvent.args.beneficiary1, user2, "first beneficiary is wrong");
                assert.equal(logEvent.args.beneficiary2, user3, "second beneficiary is wrong");
                assert.equal(logEvent.args.amount, amount/2, "arg amount is wrong: " + logEvent.args.amount/2);
                assert.equal(logEvent.args.remainder, amount%2, "arg amount is wrong: " + logEvent.args.amount/2);
              });
            });

            describe('#()', async function() {
                it('should allowed calls from any user', async function() {
                    const amount           = web3.utils.toWei('0.0000001', 'ether');

                    let result = await instance.sendTransaction({ from: user1, gas: MAX_GAS, value: amount })
                    .should.be.fulfilled;

                    assert.equal(result.logs.length, 1);
                    let logEvent = result.logs[0];

                    assert.equal(logEvent.event, "LogAmountReceived", "LogAmountReceived name is wrong");
                    assert.equal(logEvent.args.caller, user1, "LogAmountReceived arg caller is wrong");
                    assert.equal(logEvent.args.amount, amount, "arg amount is wrong: " + logEvent.args.amount);

                    result = await instance.sendTransaction({ from: owner, gas: MAX_GAS, value: amount })
                    .should.be.fulfilled;                    

                    assert.equal(result.logs.length, 1);
                    logEvent = result.logs[0];

                    assert.equal(logEvent.event, "LogAmountReceived", "LogAmountReceived name is wrong");
                    assert.equal(logEvent.args.caller, owner, "LogAmountReceived arg caller is wrong");
                    assert.equal(logEvent.args.amount, amount, "arg amount is wrong: " + logEvent.args.amount);
                });

                it('should increase contracts balances', async function() {
                     let preSplitterBalance  = await web3.eth.getBalance(instance.address);
                     assert.isTrue(preSplitterBalance == 0);

                     const amount           = web3.utils.toWei('0.0000001', 'ether');
                     let result = await instance.sendTransaction({ from: user1, gas: MAX_GAS, value: amount })
                     .should.be.fulfilled;

                     // verifies contracts funds
                     let expectedAmount = amount;
                     let postSplitterBalance  = await web3.eth.getBalance(instance.address);
                     assert.equal(expectedAmount.toString(), postSplitterBalance.toString());

                     // verifies beneficiary balances
                     let userBalance = await instance.balances(user1);  
                     assert.equal(expectedAmount.toString(), userBalance.toString());
                });
            });
        });
    }); 
}); 


