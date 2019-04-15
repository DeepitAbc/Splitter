"use strict";

// Import the third-party libraries
const Promise = require("bluebird");

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

const { BN, sha3 } = web3.utils;

// Import the smart contracts
const Splitter       = artifacts.require('Splitter.sol');

contract('Splitter', function(accounts) {
    const MAX_GAS = 4700000;


    let owner, user1, user2, user3;
    before("checking accounts", async function() {
        assert.isAtLeast(accounts.length, 4, "not enough accounts");
        [owner, user1, user2, user3] = accounts;
    });    

    describe('#Splitter()', async function() {

       describe("#constructor(pause=false)", async function() {
          it("verify event constructor", async function() {
             let instance = await Splitter.new( false, { from: owner , gas: MAX_GAS})
             const receipt = await web3.eth.getTransactionReceiptMined(instance.transactionHash);
             receipt.logs.length.should.be.equal(1);
             const logEventSplitterCreated = receipt.logs[0];
             logEventSplitterCreated.topics[0].should.be.equal(web3.utils.sha3('LogSplitterCreated(address)'));
           });
       });

       describe("#constructor(pause=true)", async function() {
          let pausedInstance;
          beforeEach("should deploy Splitter pausedInstance",  async function() {
             pausedInstance = await Splitter.new(true, { from: owner , gas: MAX_GAS}).should.be.fulfilled;
          });

          it("verify makeSplit fail", async function() {
             await web3.eth.expectedExceptionPromise(
                   () => { return pausedInstance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  }); },
                   MAX_GAS);
          });

          it("verify after resume() makeSplit is OK", async function() {
             await pausedInstance.resume({ from: owner, gas: MAX_GAS})
             .should.be.fulfilled;
             await pausedInstance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  })
             .should.be.fulfilled;
           });
       });

       describe("#constructor(true)", async function() {
          it("verify if contract is deployed on pause and then resume() the makeSplit is OK", async function() {
             let instance = await Splitter.new(true, { from: owner , gas: MAX_GAS})

             await instance.resume({ from: owner, gas: MAX_GAS})
             .should.be.fulfilled;
             await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  })
             .should.be.fulfilled;
           });
       });


        describe('Test methods', async function() {
            let instance;

            beforeEach("should deploy Splitter instance",  async function() {
                instance = await Splitter.new(false, { from: owner , gas: MAX_GAS}).should.be.fulfilled;
            });

            describe("#pause()", async function() {
                it("is OK if called by owner", async function() {
                    await instance.pause({ from: owner, gas: MAX_GAS})
                   .should.be.fulfilled;
                });

                it("should fail if called by any user", async function() {
                  await web3.eth.expectedExceptionPromise(() => {
                        return instance.pause({ from: user1, gas: MAX_GAS });
                     }, MAX_GAS);
                });

                it("should fail if already paused", async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await web3.eth.expectedExceptionPromise(
                      () => {return instance.pause({ from: owner, gas: MAX_GAS }); }, 
                      MAX_GAS);
                });

                it("emit event", async function() {
                  let result = await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  assert.strictEqual(result.logs.length, 1);
                  let logEvent = result.logs[0];

                  assert.strictEqual(logEvent.event, "LogSplitterPaused", "LogSplitterPaused name is wrong");
                  assert.strictEqual(logEvent.args.owner, owner, "caller is wrong");
                });
            });

            describe("#resume()", async function() {
                it("is OK if called by owner", async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  await instance.resume({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                });

                it("should fail if called by any user", async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.resume({ from: user1, gas: MAX_GAS }); }, 
                      MAX_GAS);
                });

                it("should fail if !paused ", async function() {
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.resume({ from: owner, gas: MAX_GAS }); },
                      MAX_GAS);
                });

                it("emit event", async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  let result = await instance.resume({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  assert.strictEqual(result.logs.length, 1);
                  let logEvent = result.logs[0];

                  assert.strictEqual(logEvent.event, "LogSplitterResumed", "LogSplitterResumed name is wrong");
                  assert.strictEqual(logEvent.args.owner, owner, "caller is wrong");
                });
            });

            describe("#makeSplit()", async function() {
                it("should fail if in pause",  async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 0  }); },
                      MAX_GAS);
                });

                it("is OK if makeSplit is called after pause/resume",  async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  await instance.resume({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  })
                  .should.be.fulfilled;
                });
 
                it("should fail if first beneficiary address is zero", async function() {

		  const amount = web3.utils.toWei('100', 'Gwei');
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.makeSplit(ZERO_ADDRESS, user3, { from: user1, gas: MAX_GAS, value: amount }); },
                      MAX_GAS);
                });

                it("should fail if beneficiary2 address is zero", async function() {
		  const amount = web3.utils.toWei('100', 'Gwei');
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.makeSplit(user2, ZERO_ADDRESS, { from: user1, gas: MAX_GAS, value: amount }); }, 
                      MAX_GAS);
                });

                it("should fail if amount is zero",  async function() {
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 0  }); },
                      MAX_GAS);
                });

                it("should fail if amount is 1 wei",  async function() {
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 1  }); },
                      MAX_GAS);
                });
 
                const testValidMakeSplit = [
                  { amount: 2,  half: 1, remainder: 0 },
                  { amount: 10, half: 5, remainder: 0 },
                  { amount: 11, half: 5, remainder: 1 },
                  { amount: 100, half: 50, remainder: 0 },
                  { amount: 101, half: 50, remainder: 1 },
                  { amount: 1000001, half: 500000, remainder: 1 },
                  { amount: 1000002, half: 500001, remainder: 0 }]

                testValidMakeSplit.forEach(async function(validMakeSplitRecord) {
                    const weiAmount = validMakeSplitRecord.amount;
                    const remainder = validMakeSplitRecord.remainder;
                    const half = validMakeSplitRecord.half;
                    it(`should makeSplit ${weiAmount} wei between beneficiaries`, async function() {


                       await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: weiAmount });
                       let payerBalance = await instance.balances(user1);  
                       assert.strictEqual(payerBalance.toString(), remainder.toString(), "payer balance not equal to amount");
                       let beneficiary1Balance = await instance.balances(user2);
                       assert.strictEqual(beneficiary1Balance.toString(), half.toString(), "first beneficiary balance is wrong");
                       let beneficiary2Balance = await instance.balances(user3);
                       assert.strictEqual(beneficiary2Balance.toString(), half.toString(), "second beneficiary balance is wrong");
                    });
                });

                it("verify the emitted event",  async function() {
	  	  const amount = web3.utils.toWei('100', 'Gwei');

                  const amountBN = new BN(amount);
                  const expectedHalf = amountBN.div(new BN('2'));
                  const expectedRem = amountBN.mod(new BN('2'));

                  const result = await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: amountBN })
                  .should.be.fulfilled;
                  assert.strictEqual(result.logs.length, 1);
                  let logEvent = result.logs[0];

                  assert.strictEqual(logEvent.event, "LogMakeSplit", "LogMakeSplit name is wrong");
                  assert.strictEqual(logEvent.args.caller, user1, "caller beneficiary is wrong");
                  assert.strictEqual(logEvent.args.beneficiary1, user2, "first beneficiary is wrong");
                  assert.strictEqual(logEvent.args.beneficiary2, user3, "second beneficiary is wrong");
                  assert.strictEqual(logEvent.args.amount.toString(), expectedHalf.toString(), "arg amount is wrong: " + logEvent.args.amount);
                  assert.strictEqual(logEvent.args.remainder.toString(), expectedRem.toString(), "arg remainder is wrong: " + logEvent.args.remainder);
                });
            });

            describe("#withdraw()", async function() {
                it("should OK if have funds",  async function() {
		  const amount = web3.utils.toWei('100', 'Gwei');
                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: amount })
                  .should.be.fulfilled;
                  let splitterBalancePre  = await web3.eth.getBalance(instance.address);
                  await instance.withdraw({ from: user2, gas: MAX_GAS})
                  .should.be.fulfilled;
                  let payerBalance = await instance.balances(user2);  
                  assert.strictEqual(payerBalance.toString(), "0", "payer balances not zero after withdraw");
                });

                it("should fail if no funds",  async function() {
                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.withdraw({ from: user2, gas: MAX_GAS}); },
                      MAX_GAS);
                });

                it("should fail if in pause",  async function() {
		  const amount = web3.utils.toWei('100', 'Gwei');
                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: amount })
                  .should.be.fulfilled;

                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await web3.eth.expectedExceptionPromise(
                      () => { return instance.withdraw({ from: user2, gas: MAX_GAS}); }, 
                      MAX_GAS);
                });

                it("is OK if makeSplit/withdraw are called after pause/resume",  async function() {
                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  await instance.resume({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  })
                  .should.be.fulfilled;
                  await instance.withdraw({ from: user2, gas: MAX_GAS})
                  .should.be.fulfilled;
                });

                it("is OK if withdraw is called after pause/resume",  async function() {
                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: 10  })
                  .should.be.fulfilled;

                  await instance.pause({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;
                  await instance.resume({ from: owner, gas: MAX_GAS})
                  .should.be.fulfilled;

                  await instance.withdraw({ from: user2, gas: MAX_GAS})
                  .should.be.fulfilled;
                });
 
                it("verify the emitted event",  async function() {
		  const amount = web3.utils.toWei('100', 'Gwei');
                  const amountBN = new BN(amount);
                  const expectedHalf = amountBN.div(new BN('2'));

                  await instance.makeSplit(user2, user3, { from: user1, gas: MAX_GAS, value: amount })
                  .should.be.fulfilled;

                  const result = await instance.withdraw({ from: user2, gas: MAX_GAS})
                  .should.be.fulfilled;

                  assert.strictEqual(result.logs.length, 1);
                  let logEvent = result.logs[0];

                  assert.strictEqual(logEvent.event, "LogSplitterWithdraw", "LogSplitterWithdraw name is wrong");
                  assert.strictEqual(logEvent.args.beneficiary, user2, "caller beneficiary is wrong");
                  assert.strictEqual(logEvent.args.amount.toString(), expectedHalf.toString(), "amount is wrong");
              });
           });
        });
    }); 
}); 


