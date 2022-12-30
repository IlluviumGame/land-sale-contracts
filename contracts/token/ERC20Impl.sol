// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interfaces/IdentifiableSpec.sol";
import "../utils/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Simplistic ERC20 Implementation
 *
 * @notice Zeppelin based ERC20 implementation with minting/burning support,
 *      ERC165 support, and AccessControl capabilities
 *
 * @author Basil Gorin
 */
abstract contract ERC20Impl is IdentifiableToken, IERC165, ERC20, AccessControl {
	/**
	 * @notice Enables ERC20 transfers of the tokens
	 *      (transfer by the token owner himself)
	 * @dev Feature FEATURE_TRANSFERS must be enabled in order for
	 *      `transfer()` function to succeed
	 */
	uint32 public constant FEATURE_TRANSFERS = 0x0000_0001;

	/**
	 * @notice Enables ERC20 transfers on behalf
	 *      (transfer by someone else on behalf of token owner)
	 * @dev Feature FEATURE_TRANSFERS_ON_BEHALF must be enabled in order for
	 *      `transferFrom()` function to succeed
	 * @dev Token owner must call `approve()` first to authorize
	 *      the transfer on behalf
	 */
	uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x0000_0002;

	/**
	 * @notice Enables token owners to burn their own tokens
	 *
	 * @dev Feature FEATURE_OWN_BURNS must be enabled in order for
	 *      `burn()` function to succeed when called by token owner
	 */
	uint32 public constant FEATURE_OWN_BURNS = 0x0000_0008;

	/**
	 * @notice Enables approved operators to burn tokens on behalf of their owners
	 *
	 * @dev Feature FEATURE_BURNS_ON_BEHALF must be enabled in order for
	 *      `burn()` function to succeed when called by approved operator
	 */
	uint32 public constant FEATURE_BURNS_ON_BEHALF = 0x0000_0010;

	/**
	 * @notice Token creator is responsible for creating (minting)
	 *      tokens to an arbitrary address
	 * @dev Role ROLE_TOKEN_CREATOR allows minting tokens
	 *      (calling `mint` function)
	 */
	uint32 public constant ROLE_TOKEN_CREATOR = 0x0001_0000;

	/**
	 * @notice Token destroyer is responsible for destroying (burning)
	 *      tokens owned by an arbitrary address
	 * @dev Role ROLE_TOKEN_DESTROYER allows burning tokens
	 *      (calling `burn` function)
	 */
	uint32 public constant ROLE_TOKEN_DESTROYER = 0x0002_0000;

	/**
	 * @dev Fired in _mint() and all the dependent functions like mint(), safeMint()
	 *
	 * @param by an address which executed update
	 * @param to an address tokens ware minted to
	 * @param value amount of tokens minted
	 */
	event Minted(address indexed by, address indexed to, uint256 value);

	/**
	 * @dev Fired in _burn() and all the dependent functions like burn()
	 *
	 * @param by an address which executed update
	 * @param from an address tokens were burnt from
	 * @param value amount of tokens burnt
	 */
	event Burnt(address indexed by, address indexed from, uint256 value);

	/**
	 * @dev Creates/deploys an ERC20 token
	 *
	 * @param _name token name
	 * @param _symbol token symbol
	 */
	constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) AccessControl(msg.sender) {}

	/**
	 * @inheritdoc IERC165
	 */
	function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
		// reconstruct from current interface(s) and super interface(s) (if any)
		return interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC20).interfaceId;
	}

	/**
	 * @dev Mints (creates) some tokens to address specified
	 * @dev The value specified is treated as is without taking
	 *      into account what `decimals` value is
	 *
	 * @dev Requires executor to have `ROLE_TOKEN_CREATOR` permission
	 *
	 * @dev Throws on overflow, if totalSupply + _value doesn't fit into uint256
	 *
	 * @param _to an address to mint tokens to
	 * @param _value an amount of tokens to mint (create)
	 */
	function mint(address _to, uint256 _value) public virtual {
		// delegate to Zeppelin impl
		_mint(_to, _value);
	}

	/**
	 * @dev Burns (destroys) some tokens from the address specified
	 *
	 * @dev The value specified is treated as is without taking
	 *      into account what `decimals` value is
	 *
	 * @dev Requires executor to have `ROLE_TOKEN_DESTROYER` permission
	 *      or FEATURE_OWN_BURNS/FEATURE_BURNS_ON_BEHALF features to be enabled
	 *
	 * @dev Can be disabled by the contract creator forever by disabling
	 *      FEATURE_OWN_BURNS/FEATURE_BURNS_ON_BEHALF features and then revoking
	 *      its own roles to burn tokens and to enable burning features
	 *
	 * @param _from an address to burn some tokens from
	 * @param _value an amount of tokens to burn (destroy)
	 */
	function burn(address _from, uint256 _value) public virtual {
		// check if caller has sufficient permissions to burn tokens
		// and if not - check for possibility to burn own tokens or to burn on behalf
		if(!isSenderInRole(ROLE_TOKEN_DESTROYER)) {
			// if `_from` is equal to sender, require own burns feature to be enabled
			// otherwise require burns on behalf feature to be enabled
			require(_from == msg.sender && isFeatureEnabled(FEATURE_OWN_BURNS)
			     || _from != msg.sender && isFeatureEnabled(FEATURE_BURNS_ON_BEHALF),
			        _from == msg.sender? "burns are disabled": "burns on behalf are disabled");

			// in case of burn on behalf
			if(_from != msg.sender) {
				// read allowance value - the amount of tokens allowed to be burnt - into the stack
				uint256 _allowance = allowance(_from, msg.sender);

				// verify sender has an allowance to burn amount of tokens requested
				require(_allowance >= _value, "burn amount exceeds allowance");

				// update the allowance value
				_approve(_from, msg.sender, _allowance - _value);
			}
		}

		// delegate to Zeppelin impl
		_burn(_from, _value);

		// emit an additional event to better track who performed the operation
		emit Burnt(msg.sender, _from, _value);
	}

	/**
	 * @inheritdoc ERC20
	 */
	function _mint(address _to, uint256 _value) internal virtual override {
		// check if caller has sufficient permissions to mint tokens
		require(isSenderInRole(ROLE_TOKEN_CREATOR), "access denied");

		// delegate to super implementation
		super._mint(_to, _value);

		// emit an additional event to better track who performed the operation
		emit Minted(msg.sender, _to, _value);
	}

	/**
	 * @inheritdoc ERC20
	 */
	function _beforeTokenTransfer(address _from, address _to, uint256 _value) internal virtual override {
		// for transfers only - verify if transfers are enabled
		require(_from == address(0) || _to == address(0) // won't affect minting/burning
		     || _from == msg.sender && isFeatureEnabled(FEATURE_TRANSFERS)
		     || _from != msg.sender && isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF),
		        _from == msg.sender? "transfers are disabled": "transfers on behalf are disabled");

		// delegate to super impl
		super._beforeTokenTransfer(_from, _to, _value);
	}

}
