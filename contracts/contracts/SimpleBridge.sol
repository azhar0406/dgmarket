// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleBridge {
    address public admin;
    
    constructor() {
        admin = msg.sender;
    }
    
    event CrossChainPurchaseInitiated(
        address indexed user,
        uint256 cardId,
        uint256 usdcAmount,
        bytes32 indexed orderId
    );
    
    function emitPurchaseEvent(
        address user,
        uint256 cardId, 
        uint256 usdcAmount,
        string memory okxOrderId
    ) external {
        require(msg.sender == admin, "Only admin");
        emit CrossChainPurchaseInitiated(
            user, 
            cardId, 
            usdcAmount, 
            keccak256(abi.encodePacked(okxOrderId))
        );
    }
}