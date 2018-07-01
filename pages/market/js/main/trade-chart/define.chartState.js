;(function(namespace){
	var NOT_SUPPLIED = {};

	/**
	 * 当前正在渲染的产品代码
	 * @type {string}
	 */
	var currentSymbol = NOT_SUPPLIED;

	/**
	 * 渲染的产品代码发生变化时执行的监听器
	 * @type {Function[]}
	 */
	var symbolChangeListeners = [];

	/**
	 * 当前的图形类型。trend：分时图；k_*：K线图（k_day：日K，k_min,5：5分K）
	 */
	var currentChartType = NOT_SUPPLIED;

	/**
	 * 渲染的图形类型发生变化时执行的监听器
	 * @type {Function[]}
	 */
	var chartTypeChangeListeners = [];

	/**
	 * @typedef {String} TouchMoveAction
	 */

	/**
	 * @enum {TouchMoveAction}
	 */
	var TouchMoveActions = {
		/** 查看数据详情 */
		VIEW_DETAIL: "view-detail",

		/** 查看历史数据 */
		VIEW_HISTORY: "view-history"
	};

	/**
	 * 默认的“触摸移动所要执行的动作”
	 * @type {TouchMoveAction}
	 */
	var defaultTouchMoveAction = TouchMoveActions.VIEW_DETAIL;

	/**
	 * 触摸移动所要执行的动作
	 * @type {TouchMoveAction}
	 */
	var touchMoveAction = defaultTouchMoveAction;



	/**
	 * 获取当前正在渲染的产品代码
	 * @returns {string}
	 */
	var getCurrentSymbol = function(){
		return NOT_SUPPLIED == currentSymbol? null: currentSymbol;
	};

	/**
	 * 设置要渲染的产品的产品代码
	 * @param {String} symbol 产品代码
	 */
	var setCurrentSymbol = function(symbol){
		if(null == symbol || (symbol = String(symbol).trim()) == ""){
			console.warn("Symbol should not be empty");
			return;
		}

		if(currentSymbol == symbol)
			return;


		currentSymbol = symbol;
		touchMoveAction = defaultTouchMoveAction;

		var tmp = getCurrentSymbol();
		execSymbolChangeListeners(symbol, tmp);
	};

	/**
	 * 添加事件：“渲染的产品代码发生变化”的监听器
	 * @param {Function} listener 监听器
	 */
	var addSymbolChangeListener = function(listener){
		if(typeof listener != "function")
			return;

		if(symbolChangeListeners.indexOf(listener) == -1)
			symbolChangeListeners.push(listener);

		if(NOT_SUPPLIED != currentSymbol)
			listener(symbol, null);
	};

	/**
	 * 执行事件：“渲染的产品代码发生变化”的监听器
	 * @param {String} newSymbol 新的产品代码
	 * @param {String} oldSymbol 原来的产品代码
	 */
	var execSymbolChangeListeners = function(newSymbol, oldSymbol){
		symbolChangeListeners.forEach(function(fn){
			try{fn(newSymbol, oldSymbol);}catch(e){
				console.error(e, e.stack);
			}
		});
	};


	/**
	 * 获取当前正在在渲染的图形类型
	 * @returns {String}
	 */
	var getCurrentChartType = function(){
		return NOT_SUPPLIED == currentChartType? null: currentChartType;
	};

	/**
	 * 设置当前正在在渲染的图形类型
	 */
	var setCurrentChartType = function(type){
		if(null == type || (type = String(type).trim()) == ""){
			console.warn("Chart type should not be empty");
			return;
		}

		if(currentChartType == type)
			return;

		currentChartType = type;
		touchMoveAction = defaultTouchMoveAction;

		var tmp = getCurrentChartType();
		execChartTypeChangeListeners(type, tmp);
	};

	/**
	 * 添加事件：“渲染的图形类型发生变化”的监听器
	 * @param {Function} listener 监听器
	 */
	var addChartTypeChangeListener = function(listener){
		if(typeof listener != "function")
			return;

		if(chartTypeChangeListeners.indexOf(listener) == -1)
			chartTypeChangeListeners.push(listener);

		if(NOT_SUPPLIED != currentChartType)
			listener(currentChartType, null);
	};

	/**
	 * 执行事件：“渲染的图形类型发生变化”的监听器
	 * @param {String} newChartType 新的图形类型
	 * @param {String} oldChartType 原来的图形类型
	 */
	var execChartTypeChangeListeners = function(newChartType, oldChartType){
		chartTypeChangeListeners.forEach(function(fn){
			try{fn(newChartType, oldChartType);}catch(e){
				console.error(e, e.stack);
			}
		});
	};

	/**
	 * 设置图形类型为“分时图”
	 */
	var setChartTypeAsTrend = function(){
		setCurrentChartType("trend");
	};

	/**
	 * 设置图形类型为“K线图”
	 * @param {String} kType K线类型
	 */
	var setChartTypeAsK = function(kType){
		setCurrentChartType("k_" + kType);
	};

	/**
	 * 判断当前图形类型是否为“分时图”
	 * @returns {Boolean}
	 */
	var isCurrentChartTypeTrend = function(){
		return getCurrentChartType() == "trend";
	};

	/**
	 * 判断当前图形类型是否为“K线图”
	 * @returns {Boolean}
	 */
	var isCurrentChartTypeK = function(){
		return /^k_.+/i.test(getCurrentChartType());
	};

	/**
	 * 获取当前K线图的类型。如果当前图形类型不是K线图，则返回null
	 * @returns {String}
	 */
	var getCurrentKChartType = function(){
		if(!isCurrentChartTypeK())
			return null;

		var r = /^k_(.+)/i;
		var tmp = r.exec(getCurrentChartType());
		if(null == tmp)
			return null;

		return tmp[1];
	};

	/**
	 * 设置触摸移动所要执行的动作
	 * @param {TouchMoveAction} action 触摸移动所要执行的动作
	 */
	var setTouchMoveAction = function(action){
		touchMoveAction = action;
	};

	/**
	 * 获取当前设置的“触摸移动所要执行的动作”
	 * @returns {TouchMoveAction}
	 */
	var getTouchMoveAction = function(){
		return touchMoveAction;
	};

	namespace.chartState = {
		getCurrentSymbol: getCurrentSymbol,
		setCurrentSymbol: setCurrentSymbol,
		addSymbolChangeListener: addSymbolChangeListener,

		getCurrentChartType: getCurrentChartType,
		isCurrentChartTypeTrend: isCurrentChartTypeTrend,
		isCurrentChartTypeK: isCurrentChartTypeK,
		getCurrentKChartType: getCurrentKChartType,
		setChartTypeAsTrend: setChartTypeAsTrend,
		setChartTypeAsK: setChartTypeAsK,
		addChartTypeChangeListener: addChartTypeChangeListener,

		setTouchMoveAction: setTouchMoveAction,
		getTouchMoveAction: getTouchMoveAction,
		TouchMoveActions: TouchMoveActions
	};
})(window);