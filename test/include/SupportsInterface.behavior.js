// Auxiliary behavior for ERC165 Interface ID tests, imported from vittominacori
// Source: https://github.com/vittominacori/erc1363-payable-token/blob/master/test/introspection/SupportsInterface.behavior.js

const { makeInterfaceId } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const INTERFACES = {
  ERC165: [
    'supportsInterface(bytes4)',
  ],
  ERC1363: [
    'transferAndCall(address,uint256)',
    'transferAndCall(address,uint256,bytes)',
    'transferFromAndCall(address,address,uint256)',
    'transferFromAndCall(address,address,uint256,bytes)',
    'approveAndCall(address,uint256)',
    'approveAndCall(address,uint256,bytes)',
  ],
  ERC1363Receiver: [
    'onTransferReceived(address,address,uint256,bytes)',
  ],
  ERC1363Spender: [
    'onApprovalReceived(address,uint256,bytes)',
  ],
  ERC20: [
    'totalSupply()',
    'balanceOf(address)',
    'transfer(address,uint256)',
    'transferFrom(address,address,uint256)',
    'approve(address,uint256)',
    'allowance(address,address)',
  ],
  ERC721: [
    'balanceOf(address)',
    'ownerOf(uint256)',
    'safeTransferFrom(address,address,uint256,bytes)',
    'safeTransferFrom(address,address,uint256)',
    'transferFrom(address,address,uint256)',
    'approve(address,uint256)',
    'setApprovalForAll(address,bool)',
    'getApproved(uint256)',
    'isApprovedForAll(address,address)',
  ],
  MintableERC721: [
    'exists(uint256)',
    'mint(address,uint256)',
    'safeMint(address,uint256)',
    'safeMint(address,uint256,bytes)',
  ],
  LandERC721Metadata: [
    'viewMetadata(uint256)',
    'getMetadata(uint256)',
    'hasMetadata(uint256)',
    'setMetadata(uint256,(uint8,uint8,uint16,uint16,uint8,uint16,uint8,uint8,uint8,uint160))',
    'removeMetadata(uint256)',
    'mintWithMetadata(address,uint256,(uint8,uint8,uint16,uint16,uint8,uint16,uint8,uint8,uint8,uint160))',
  ],
  ImmutableMintableERC721: [
    'mintFor(address,uint256,bytes)',
  ]
};

const INTERFACE_IDS = {};
const FN_SIGNATURES = {};
for (const k of Object.getOwnPropertyNames(INTERFACES)) {
  INTERFACE_IDS[k] = makeInterfaceId.ERC165(INTERFACES[k]);
  for (const fnName of INTERFACES[k]) {
    // the interface id of a single function is equivalent to its function signature
    FN_SIGNATURES[fnName] = makeInterfaceId.ERC165([fnName]);
  }
}

function shouldSupportInterfaces (interfaces = [], contractInstance) {
  describe('Contract interface', function () {
    beforeEach(function () {
      this.contractUnderTest = contractInstance || this.mock || this.token || this.holder;
    });

    for (const k of interfaces) {
      const interfaceId = INTERFACE_IDS[k];
      describe(k, function () {
        describe('ERC165\'s supportsInterface(bytes4)', function () {
          it('uses less than 30k gas [skip-on-coverage]', async function () {
            expect(await this.contractUnderTest.supportsInterface.estimateGas(interfaceId)).to.be.lte(30000);
          });

          it(`claims support ${k}: ${interfaceId}`, async function () {
            expect(await this.contractUnderTest.supportsInterface(interfaceId)).to.equal(true);
          });
        });

        for (const fnName of INTERFACES[k]) {
          const fnSig = FN_SIGNATURES[fnName];
          describe(fnName, function () {
            it('has to be implemented', function () {
              expect(this.contractUnderTest.abi.filter(fn => fn.signature === fnSig).length).to.equal(1);
            });
          });
        }
      });
    }
  });
}

module.exports = {
  INTERFACE_IDS,
  shouldSupportInterfaces,
};
