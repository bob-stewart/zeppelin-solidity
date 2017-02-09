const assertJump = require('./helpers/assertJump');
const timer = require('./helpers/timer');

contract('GrantableToken', function(accounts) {
  let token = null
  let now = 0

  const tokenAmount = 50

  const granter = accounts[0]
  const receiver = accounts[1]

  beforeEach(async () => {
    token = await GrantableTokenMock.new(granter, 100);
    now = +new Date()/1000;
  })

  it('granter can grant tokens without vesting', async () => {
    await token.grantTokens(receiver, tokenAmount, { from: granter })

    assert.equal(await token.balanceOf(receiver), tokenAmount);
    assert.equal(await token.transferrableTokens(receiver, +new Date()/1000), tokenAmount);
  })

  describe('getting a token grant', async () => {
    const cliff = 1
    const vesting = 2 // seconds

    beforeEach(async () => {
      await token.grantVestedTokens(receiver, tokenAmount, now, now + cliff, now + vesting, { from: granter })
    })

    it('tokens are received', async () => {
      assert.equal(await token.balanceOf(receiver), tokenAmount);
    })

    it('has 0 transferrable tokens before cliff', async () => {
      assert.equal(await token.transferrableTokens(receiver, now), 0);
    })

    it('all tokens are transferrable after vesting', async () => {
      assert.equal(await token.transferrableTokens(receiver, now + vesting + 1), tokenAmount);
    })

    it('throws when trying to transfer non vested tokens', async () => {
      try {
        await token.transfer(accounts[7], 1, { from: receiver })
      } catch(error) {
        return assertJump(error);
      }
      assert.fail('should have thrown before');
    })

    it('can be revoked by granter', async () => {
      await token.revokeTokenGrant(receiver, 0, { from: granter });
      assert.equal(await token.balanceOf(receiver), 0);
      assert.equal(await token.balanceOf(granter), 100);
    })

    it('cannot be revoked by non granter', async () => {
      try {
        await token.revokeTokenGrant(receiver, 0, { from: accounts[3] });
      } catch(error) {
        return assertJump(error);
      }
      assert.fail('should have thrown before');
    })

    it('can be revoked by granter and non vested tokens are returned', async () => {
      await timer(cliff);
      await token.revokeTokenGrant(receiver, 0, { from: granter });
      assert.equal(await token.balanceOf(receiver), tokenAmount * cliff / vesting);
    })

    it('can transfer all tokens after vesting ends', async () => {
      await timer(vesting + 1);
      await token.transfer(accounts[7], tokenAmount, { from: receiver })
      assert.equal(await token.balanceOf(accounts[7]), tokenAmount);
    })
  })
});
