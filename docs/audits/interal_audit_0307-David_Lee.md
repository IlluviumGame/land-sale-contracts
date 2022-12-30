03/07/22 Audit Suggestions by David Lee:

```
LandERC721.sol
- Recommend using safeMint() function to instead of mint() function in line 372, mintWithMetadata() function
PS: Please check the comment - https://github.com/IlluviumGame/land-sale/blob/master/contracts/token/LandERC721.sol#L384

LandSale.sol
- Recommend the additional checking for _royaltyPercentage in line 160, setRoyaltyInfo() function in RoyaltyERC721 contract.
require(_royaltyPercentage <= 100_00, “too high royalties”);
- Recommend adding a require statement to check the return value or using safeTransfer() function in line 768, withdrawTo() function.
- Recommend adding a require statement to check the return value or using safeTransfer() function in line 789, rescueErc20() function.

ERC721Impl.sol
- Recommend adding a require statement to check the return value or using safeTransfer() function in line 675, rescueErc20() function.

UpgradeableERC721.sol
- Recommend adding a require statement to check the return value or using safeTransfer() function in line 380, rescueErc20() function.
```

03/31/22 Audit Responses by Basil Gorin
> ```
> LandERC721.sol
> - Recommend using safeMint() function to instead of mint() function in line 372, mintWithMetadata() function
> PS: Please check the comment - https://github.com/IlluviumGame/land-sale/blob/master/contracts/token/LandERC721.sol#L384
> ```

We're using `mint()` function to reduce the risks of reentrancy attacks during the initial sale of the Land tokens.
There is no functional need to execute any callbacks during this process.

> ```
> LandSale.sol
> - Recommend the additional checking for _royaltyPercentage in line 160, setRoyaltyInfo() function in RoyaltyERC721 contract.
> require(_royaltyPercentage <= 100_00, “too high royalties”);
> ```

An output of the `royaltyInfo()` function is informational, it doesn't break anything in the contract itself;
the check is to be made in the client contracts and other client systems relying on this function. 

> ```
> LandSale.sol
> - Recommend adding a require statement to check the return value or using safeTransfer() function in line 768, withdrawTo() function.
> ```

`withdrawTo()` operates on the sILV token only, which has the `transfer` function which never returns `false`
(it throws on any error).

> ```
> LandSale.sol
> - Recommend adding a require statement to check the return value or using safeTransfer() function in line 789, rescueErc20() function.
> ERC721Impl.sol
> - Recommend adding a require statement to check the return value or using safeTransfer() function in line 675, rescueErc20() function.
>
> UpgradeableERC721.sol
> - Recommend adding a require statement to check the return value or using safeTransfer() function in line 380, rescueErc20() function.
> ```

fixed by adding a ERC20 `transfer` function return value check
