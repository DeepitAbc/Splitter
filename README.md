# splitter
Splitter Smart Contract - B9Lab Course Practice

Requirements: 
You will create a smart contract named Splitter whereby:
* there are 3 people: Alice, Bob and Carol.
* we can see the balance of the Splitter contract on the Web page.
* whenever Alice sends ether to the contract for it to be split, half of it goes to Bob and the other half to Carol.
* we can see the balances of Alice, Bob and Carol on the Web page.
* Alice can use the Web page to split her ether.

Implementation choice: 
* using safemath to avoid overflow
* event generation
* any user can split their new funds (using makeSplit() method);
* if funds provided to the makeSplit are odd the remainder is leaved to the the sender
* withdraw method to retrive funds
* suspend and resume method

Project contains:
* contract
* test
* app
