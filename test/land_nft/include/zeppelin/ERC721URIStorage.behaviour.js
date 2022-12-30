// Auxiliary behavior for OpenZeppelin ERC721 test, imported from OpenZeppelin project
// Source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/token/ERC721/extensions/ERC721URIStorage.test.js

const { BN, expectRevert } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

function shouldBehaveLikeERC721URIStorage(owner, burnable = true) {
  const firstTokenId = new BN('5042');
  const nonExistentTokenId = new BN('13');

  describe('token URI', function () {
    beforeEach(async function () {
      await this.token.mint(owner, firstTokenId);
    });

    const baseURI = 'https://api.example.com/v1/';
    const sampleUri = 'mock://mytoken';

    it('it is empty by default', async function () {
      expect(await this.token.tokenURI(firstTokenId)).to.be.equal('');
    });

    it('reverts when queried for non existent token id', async function () {
      await expectRevert(
        this.token.tokenURI(nonExistentTokenId), 'ERC721URIStorage: URI query for nonexistent token',
      );
    });

    it('can be set for a token id', async function () {
      await this.token.setTokenURI(firstTokenId, sampleUri);
      expect(await this.token.tokenURI(firstTokenId)).to.be.equal(sampleUri);
    });

    it('reverts when setting for non existent token id', async function () {
      await expectRevert(
        this.token.setTokenURI(nonExistentTokenId, sampleUri), 'ERC721URIStorage: URI set of nonexistent token',
      );
    });

    it('base URI can be set', async function () {
      await this.token.setBaseURI(baseURI);
      expect(await this.token.baseURI()).to.equal(baseURI);
    });

    it('base URI is added as a prefix to the token URI', async function () {
      await this.token.setBaseURI(baseURI);
      await this.token.setTokenURI(firstTokenId, sampleUri);

      expect(await this.token.tokenURI(firstTokenId)).to.be.equal(baseURI + sampleUri);
    });

    it('token URI can be changed by changing the base URI', async function () {
      await this.token.setBaseURI(baseURI);
      await this.token.setTokenURI(firstTokenId, sampleUri);

      const newBaseURI = 'https://api.example.com/v2/';
      await this.token.setBaseURI(newBaseURI);
      expect(await this.token.tokenURI(firstTokenId)).to.be.equal(newBaseURI + sampleUri);
    });

    it('tokenId is appended to base URI for tokens with no URI', async function () {
      await this.token.setBaseURI(baseURI);

      expect(await this.token.tokenURI(firstTokenId)).to.be.equal(baseURI + firstTokenId);
    });

    if(burnable) {
      it('tokens without URI can be burnt ', async function () {
        await this.token.burn(firstTokenId, { from: owner });

        expect(await this.token.exists(firstTokenId)).to.equal(false);
        await expectRevert(
        this.token.tokenURI(firstTokenId), 'ERC721URIStorage: URI query for nonexistent token',
        );
      });

      it('tokens with URI can be burnt ', async function () {
        await this.token.setTokenURI(firstTokenId, sampleUri);

        await this.token.burn(firstTokenId, { from: owner });

        expect(await this.token.exists(firstTokenId)).to.equal(false);
        await expectRevert(
        this.token.tokenURI(firstTokenId), 'ERC721URIStorage: URI query for nonexistent token',
        );
      });
    }
  });
}

module.exports = {
  shouldBehaveLikeERC721URIStorage,
}
