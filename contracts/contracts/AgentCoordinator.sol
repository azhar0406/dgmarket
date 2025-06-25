// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DGMarketCore.sol";
import "./PriceOracle.sol";

/**
 * @title AgentCoordinator
 * @dev Multi-agent coordination system for DG Market automation (Simplified Version)
 * @notice Coordinates monitoring, restocking, trading, and price discovery agents
 */
contract AgentCoordinator is Ownable2Step, Pausable, ReentrancyGuard {
    
    // Agent types
    enum AgentType {
        MONITORING,
        RESTOCKING, 
        TRADING,
        PRICE_DISCOVERY
    }
    
    // Agent status
    enum AgentStatus {
        INACTIVE,
        ACTIVE,
        SUSPENDED,
        MAINTENANCE
    }
    
    // Agent configuration
    struct AgentConfig {
        AgentType agentType;
        AgentStatus status;
        address operator; // Address authorized to operate this agent
        uint256 lastActivity;
        uint256 activityCount;
        mapping(string => bytes32) parameters; // Configurable parameters
        string[] parameterKeys; // Track parameter keys
    }
    
    // Task structure for agent coordination
    struct Task {
        uint256 taskId;
        AgentType assignedAgent;
        bytes32 taskHash;
        uint256 createdAt;
        uint256 deadline;
        bool completed;
        bytes result;
        address requestor;
    }
    
    // Market conditions for agent decision making
    struct MarketConditions {
        uint256 totalListings;
        uint256 averagePrice;
        uint256 volume24h;
        uint256 lastUpdated;
        mapping(string => uint256) categoryVolumes;
    }
    
    // Contracts
    DGMarketCore public immutable marketContract;
    PriceOracle public immutable priceOracle;
    
    // Agent management
    mapping(AgentType => AgentConfig) public agents;
    mapping(address => AgentType[]) public operatorAgents;
    
    // Task management
    mapping(uint256 => Task) public tasks;
    uint256 private nextTaskId;
    
    // Market conditions
    MarketConditions public marketConditions;
    
    // Agent activity tracking
    mapping(AgentType => uint256) public agentActivityCount;
    mapping(AgentType => uint256) public agentLastActivity;
    
    // Thresholds and limits
    uint256 public constant MAX_TASK_DURATION = 1 hours;
    uint256 public constant MONITORING_INTERVAL = 5 minutes;
    uint256 public constant PRICE_UPDATE_INTERVAL = 1 minutes;
    
    // Events
    event AgentRegistered(AgentType indexed agentType, address indexed operator);
    event AgentStatusChanged(AgentType indexed agentType, AgentStatus oldStatus, AgentStatus newStatus);
    event TaskCreated(uint256 indexed taskId, AgentType indexed agentType, address indexed requestor);
    event TaskCompleted(uint256 indexed taskId, AgentType indexed agentType, bool success);
    event MarketConditionsUpdated(uint256 totalListings, uint256 averagePrice, uint256 volume24h);
    event AgentParameterUpdated(AgentType indexed agentType, string parameter, bytes32 value);
    event EmergencyAction(AgentType indexed agentType, string action, bytes data);
    
    // Custom errors
    error AgentNotActive(AgentType agentType);
    error UnauthorizedOperator(AgentType agentType, address operator);
    error TaskNotFound(uint256 taskId);
    error TaskExpired(uint256 taskId);
    error InvalidTaskAssignment(uint256 taskId, AgentType agentType);
    
    // Simplified constructor without Chainlink Functions
    constructor(
        address _marketContract,
        address _priceOracle
    ) Ownable(msg.sender) {
        require(_marketContract != address(0), "Invalid market contract");
        require(_priceOracle != address(0), "Invalid price oracle");
        
        marketContract = DGMarketCore(_marketContract);
        priceOracle = PriceOracle(_priceOracle);
        nextTaskId = 1;
        
        // Initialize market conditions
        marketConditions.lastUpdated = block.timestamp;
    }
    
    /**
     * @dev Register a new agent with configuration
     * @param agentType The type of agent to register
     * @param operator The address authorized to operate this agent
     */
    function registerAgent(
        AgentType agentType,
        address operator
    ) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        require(agents[agentType].operator == address(0), "Agent already registered");
        
        AgentConfig storage agent = agents[agentType];
        agent.agentType = agentType;
        agent.status = AgentStatus.INACTIVE;
        agent.operator = operator;
        agent.lastActivity = block.timestamp;
        agent.activityCount = 0;
        
        operatorAgents[operator].push(agentType);
        
        emit AgentRegistered(agentType, operator);
    }
    
    /**
     * @dev Update agent status
     * @param agentType The agent type
     * @param newStatus The new status
     */
    function updateAgentStatus(
        AgentType agentType,
        AgentStatus newStatus
    ) external onlyOwner {
        require(agents[agentType].operator != address(0), "Agent not registered");
        
        AgentStatus oldStatus = agents[agentType].status;
        agents[agentType].status = newStatus;
        
        emit AgentStatusChanged(agentType, oldStatus, newStatus);
    }
    
    /**
     * @dev Set agent parameter
     * @param agentType The agent type
     * @param key Parameter key
     * @param value Parameter value
     */
    function setAgentParameter(
        AgentType agentType,
        string calldata key,
        bytes32 value
    ) external onlyOwner {
        require(agents[agentType].operator != address(0), "Agent not registered");
        
        AgentConfig storage agent = agents[agentType];
        
        // Add key to tracking if new
        if (agent.parameters[key] == bytes32(0)) {
            agent.parameterKeys.push(key);
        }
        
        agent.parameters[key] = value;
        
        emit AgentParameterUpdated(agentType, key, value);
    }
    
    /**
     * @dev Get agent parameter
     * @param agentType The agent type
     * @param key Parameter key
     * @return The parameter value
     */
    function getAgentParameter(
        AgentType agentType,
        string calldata key
    ) external view returns (bytes32) {
        return agents[agentType].parameters[key];
    }
    
    /**
     * @dev Create a new task for an agent
     * @param agentType The agent to assign the task to
     * @param taskHash Hash of the task data
     * @param deadline Task deadline
     * @return taskId The created task ID
     */
    function createTask(
        AgentType agentType,
        bytes32 taskHash,
        uint256 deadline
    ) external whenNotPaused returns (uint256 taskId) {
        if (agents[agentType].status != AgentStatus.ACTIVE) {
            revert AgentNotActive(agentType);
        }
        
        require(deadline > block.timestamp, "Invalid deadline");
        require(deadline <= block.timestamp + MAX_TASK_DURATION, "Deadline too far");
        
        taskId = nextTaskId;
        nextTaskId++;
        
        tasks[taskId] = Task({
            taskId: taskId,
            assignedAgent: agentType,
            taskHash: taskHash,
            createdAt: block.timestamp,
            deadline: deadline,
            completed: false,
            result: "",
            requestor: msg.sender
        });
        
        emit TaskCreated(taskId, agentType, msg.sender);
        return taskId;
    }
    
    /**
     * @dev Complete a task (called by agent operator)
     * @param taskId The task ID
     * @param result The task result data
     */
    function completeTask(
        uint256 taskId,
        bytes calldata result
    ) external whenNotPaused nonReentrant {
        Task storage task = tasks[taskId];
        
        if (task.taskId == 0) {
            revert TaskNotFound(taskId);
        }
        
        if (block.timestamp > task.deadline) {
            revert TaskExpired(taskId);
        }
        
        if (msg.sender != agents[task.assignedAgent].operator) {
            revert UnauthorizedOperator(task.assignedAgent, msg.sender);
        }
        
        require(!task.completed, "Task already completed");
        
        task.completed = true;
        task.result = result;
        
        // Update agent activity
        agents[task.assignedAgent].lastActivity = block.timestamp;
        agents[task.assignedAgent].activityCount++;
        agentActivityCount[task.assignedAgent]++;
        agentLastActivity[task.assignedAgent] = block.timestamp;
        
        emit TaskCompleted(taskId, task.assignedAgent, true);
    }
    
    /**
     * @dev Update market conditions (called by monitoring agent)
     * @param totalListings Current total listings
     * @param averagePrice Current average price
     * @param volume24h 24-hour volume
     * @param categories Array of category names
     * @param categoryVolumes Array of category volume data
     */
    function updateMarketConditions(
        uint256 totalListings,
        uint256 averagePrice,
        uint256 volume24h,
        string[] calldata categories,
        uint256[] calldata categoryVolumes
    ) external whenNotPaused {
        if (msg.sender != agents[AgentType.MONITORING].operator) {
            revert UnauthorizedOperator(AgentType.MONITORING, msg.sender);
        }
        
        require(categories.length == categoryVolumes.length, "Array length mismatch");
        
        marketConditions.totalListings = totalListings;
        marketConditions.averagePrice = averagePrice;
        marketConditions.volume24h = volume24h;
        marketConditions.lastUpdated = block.timestamp;
        
        // Update category volumes
        for (uint256 i = 0; i < categories.length; i++) {
            marketConditions.categoryVolumes[categories[i]] = categoryVolumes[i];
        }
        
        emit MarketConditionsUpdated(totalListings, averagePrice, volume24h);
    }
    
    /**
     * @dev Get agent information
     * @param agentType The agent type
     * @return operator The agent operator address
     * @return status The current status
     * @return lastActivity Last activity timestamp
     * @return activityCount Total activity count
     */
    function getAgentInfo(AgentType agentType) external view returns (
        address operator,
        AgentStatus status,
        uint256 lastActivity,
        uint256 activityCount
    ) {
        AgentConfig storage agent = agents[agentType];
        return (
            agent.operator,
            agent.status,
            agent.lastActivity,
            agent.activityCount
        );
    }
    
    /**
     * @dev Get all parameter keys for an agent
     * @param agentType The agent type
     * @return Array of parameter keys
     */
    function getAgentParameterKeys(AgentType agentType) external view returns (string[] memory) {
        return agents[agentType].parameterKeys;
    }
    
    /**
     * @dev Get task information
     * @param taskId The task ID
     * @return id Task ID
     * @return assignedAgent Agent type assigned to this task
     * @return taskHash Task hash
     * @return createdAt Creation timestamp
     * @return deadline Task deadline
     * @return completed Whether task is completed
     * @return result Task result data
     * @return requestor Address that requested the task
     */
    function getTask(uint256 taskId) external view returns (
        uint256 id,
        AgentType assignedAgent,
        bytes32 taskHash,
        uint256 createdAt,
        uint256 deadline,
        bool completed,
        bytes memory result,
        address requestor
    ) {
        Task storage task = tasks[taskId];
        return (
            task.taskId,
            task.assignedAgent,
            task.taskHash,
            task.createdAt,
            task.deadline,
            task.completed,
            task.result,
            task.requestor
        );
    }
    
    /**
     * @dev Get current market conditions
     * @return totalListings Current total listings
     * @return averagePrice Current average price
     * @return volume24h 24-hour volume
     * @return lastUpdated Last update timestamp
     */
    function getMarketConditions() external view returns (
        uint256 totalListings,
        uint256 averagePrice,
        uint256 volume24h,
        uint256 lastUpdated
    ) {
        return (
            marketConditions.totalListings,
            marketConditions.averagePrice,
            marketConditions.volume24h,
            marketConditions.lastUpdated
        );
    }
    
    /**
     * @dev Get category volume
     * @param category The category name
     * @return The volume for this category
     */
    function getCategoryVolume(string calldata category) external view returns (uint256) {
        return marketConditions.categoryVolumes[category];
    }
    
    /**
     * @dev Get agents operated by an address
     * @param operator The operator address
     * @return Array of agent types operated by this address
     */
    function getOperatorAgents(address operator) external view returns (AgentType[] memory) {
        return operatorAgents[operator];
    }
    
    /**
     * @dev Check if monitoring is due (for external monitoring)
     * @return Whether monitoring should be triggered
     */
    function isMonitoringDue() external view returns (bool) {
        return block.timestamp >= agentLastActivity[AgentType.MONITORING] + MONITORING_INTERVAL;
    }
    
    /**
     * @dev Check if price update is due
     * @return Whether price discovery should be triggered
     */
    function isPriceUpdateDue() external view returns (bool) {
        return block.timestamp >= agentLastActivity[AgentType.PRICE_DISCOVERY] + PRICE_UPDATE_INTERVAL;
    }
    
    /**
     * @dev Get system health status
     * @return isHealthy Whether all agents are functioning properly
     * @return unhealthyAgents Array of unhealthy agent types
     */
    function getSystemHealth() external view returns (
        bool isHealthy,
        AgentType[] memory unhealthyAgents
    ) {
        AgentType[] memory tempUnhealthy = new AgentType[](4);
        uint256 unhealthyCount = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            AgentType agentType = AgentType(i);
            if (agents[agentType].operator != address(0)) {
                // Check if agent is healthy (active and recent activity)
                bool isAgentHealthy = agents[agentType].status == AgentStatus.ACTIVE &&
                    block.timestamp <= agents[agentType].lastActivity + (MONITORING_INTERVAL * 3);
                
                if (!isAgentHealthy) {
                    tempUnhealthy[unhealthyCount] = agentType;
                    unhealthyCount++;
                }
            }
        }
        
        // Create properly sized array
        AgentType[] memory finalUnhealthy = new AgentType[](unhealthyCount);
        for (uint256 i = 0; i < unhealthyCount; i++) {
            finalUnhealthy[i] = tempUnhealthy[i];
        }
        
        return (unhealthyCount == 0, finalUnhealthy);
    }
    
    /**
     * @dev Clean up expired tasks
     * @param maxTasks Maximum number of tasks to clean up in one call
     */
    function cleanupExpiredTasks(uint256 maxTasks) external {
        uint256 cleaned = 0;
        uint256 currentTaskId = 1;
        
        while (cleaned < maxTasks && currentTaskId < nextTaskId) {
            Task storage task = tasks[currentTaskId];
            
            if (!task.completed && block.timestamp > task.deadline) {
                // Mark as completed with failure
                task.completed = true;
                task.result = "EXPIRED";
                
                emit TaskCompleted(currentTaskId, task.assignedAgent, false);
                cleaned++;
            }
            
            currentTaskId++;
        }
    }
    
    /**
     * @dev Get total number of tasks
     * @return The total number of tasks created
     */
    function getTotalTasks() external view returns (uint256) {
        return nextTaskId - 1;
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency shutdown of all agents
     */
    function emergencyShutdown() external onlyOwner {
        for (uint256 i = 0; i < 4; i++) {
            AgentType agentType = AgentType(i);
            if (agents[agentType].operator != address(0)) {
                agents[agentType].status = AgentStatus.SUSPENDED;
            }
        }
        _pause();
    }
}