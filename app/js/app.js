
require("file-loader?name=../index.html!../index.html");

const Web3 = require("web3");
//const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// Not to forget our built contract
const splitterJson = require("../../build/contracts/Splitter.json");

// Supports Metamask, and other wallets that provide / inject 'web3'.
if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(web3.currentProvider);
} else {
    // Your preferred fallback.
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545')); 
}

const Splitter = truffleContract(splitterJson);
Splitter.setProvider(web3.currentProvider);

window.addEventListener('load', async () => {

    const accounts = await window.web3.eth.getAccounts();
    console.log("AccountsLength:",accounts.length);
    if (accounts.length === 0) {
       $("#contractBalance").html("NA");
       $("#bobBalance").html("NA");
       $("#carolBalance").html("NA");
       $("#aliceBalance").html("NA");
       $("#status").html("No account with which to transact");
       console.log ("ERROR: No Account available");
       return;
    }
    let aliceAccount = accounts[0];
    let bobAccount = accounts[1];
    let carolAccount = accounts[2];

    network = await window.web3.eth.net.getId();
    console.log ("network",network.toString(10));
    let instance;

    try {
       console.log ("Try to get Splitter instance ...");
       instance = await Splitter.deployed();
    }
    catch(error) {
       $("#status").html("error to rcess nod");
       $("#contractBalance").html("NA");
       $("#bobBalance").html("NA");
       $("#carolBalance").html("NA");
       console.log ("Error:",error);
    }
    console.log ("contract Address",instance.address);

    await showBalances();

    $("#updateBalances").click(async function(){
      console.log ("the withdrawBob was clicked.");
      await showBalances();
    }); 

    $("#makeSplit").click(async function(){
      console.log ("the makeSplit was clicked.");
      await makeSplit();
    }); 

    $("#withdrawAlice").click(async function(){
      console.log ("the withdrawAlice was clicked.");
      await withdraw(aliceAccount);
    }); 
    
    $("#withdrawBob").click(async function(){
      console.log ("the withdrawBob was clicked.");
      await withdraw(bobAccount);
    }); 

    $("#withdrawCarol").click(async function(){
      console.log ("the withdrawCarol was clicked.");
      await withdraw(carolAccount);
    }); 


    async function showBalances() {
       try {
          const contractBalance = await window.web3.eth.getBalance(instance.address);
          const aliceBalance = await instance.balances(aliceAccount)
          const bobBalance = await instance.balances(bobAccount)
          const carolBalance = await instance.balances(carolAccount)

          console.log ("Contract Balance",contractBalance);
          console.log("Account[Alice]=", aliceAccount,aliceBalance.toString(10));
          console.log("Account[Bob]=", bobAccount,bobBalance.toString(10));
          console.log("Account[Carol]=", carolAccount,carolBalance.toString(10));

          $("#contractBalance").html(contractBalance.toString(10))
          $("#aliceBalance").html(aliceBalance.toString(10))
          $("#bobBalance").html(bobBalance.toString(10))
          $("#carolBalance").html(carolBalance.toString(10))
          $("#status").html("OK");
       }
       catch(error) {
          $("#status").html("error to retrive balances");
          console.log ("Error:",error);
       }
    }

    async function makeSplit() {
       const GAS = 300000; 

       try {
           let amount = $("input[name='amount']").val();
       
           console.log ("split: ",carolAccount, ",",bobAccount, " from: ",aliceAccount);
           console.log ("amount: ", amount);
           let txObj = await instance.makeSplit(carolAccount, bobAccount, 
                { from: aliceAccount, gas: GAS, value: amount})
                .on("transactionHash",
                    txHash => $("#status").html("Transaction on the way " + txHash))

           const receipt = txObj.receipt;
           console.log("got receipt", receipt);
           if (!receipt.status) {
              console.error("Wrong status");
              console.error(receipt);
              $("#status").html("There was an error in the tx execution, status not 1");
           } else if (receipt.logs.length == 0) {
              console.error("Empty logs");
              console.error(receipt);
              $("#status").html("There was an error in the tx execution, missing expected event");
           } else {
              console.log(receipt.logs[0]);
              $("#status").html("Transfer executed");
         }
       }
       catch(error) {
          $("#status").html("transaction error");
          console.log ("Error:",error);
       }
    };

    async function withdraw(address) {
       const GAS = 300000; 

       try {
           let txObj = await instance.withdraw( { from: address, gas: GAS})
                .on("transactionHash",
                    txHash => $("#status").html("Transaction on the way " + txHash))

           const receipt = txObj.receipt;
           console.log("got receipt", receipt);
           if (!receipt.status) {
              console.error("Wrong status");
              console.error(receipt);
              $("#status").html("There was an error in the tx execution, status not 1");
           } else if (receipt.logs.length == 0) {
              console.error("Empty logs");
              console.error(receipt);
              $("#status").html("There was an error in the tx execution, missing expected event");
           } else {
              console.log(receipt.logs[0]);
              $("#status").html("Transfer executed");
         }
       }
       catch(error) {
          $("#status").html("transaction error");
          console.log ("Error:",error);
       }
    };
});
