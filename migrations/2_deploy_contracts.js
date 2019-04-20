
const Splitter = artifacts.require('Splitter.sol');

module.exports = async (deployer, network, accounts) => {

 await deployer.deploy(Splitter);

};



