;(function(namespace){
	var util = namespace.util,
		chartState = namespace.chartState;

	var tradeChartObj = util.find(".trade-chart"),
		chartTypeObjs = util.findAll(".chart-type span"),
		switchObj = util.find(".chart-container .switch");

	/**
	 * 选中给定的图形类型并执行对应的图形渲染
	 * @param {HTMLElement} obj 待选中的图形类型对应的DOM元素
	 */
	var selectChartTypeAndDrawChart = function(obj){
		var activeObj = document.querySelector(".chart-type .active");
		if(activeObj == obj)
			return;

		activeObj && activeObj.classList.remove("active");
		obj.classList.add("active");

		if(obj.classList.contains("trend")){
			tradeChartObj.classList.remove("k");
			tradeChartObj.classList.add("trend");

			chartState.setChartTypeAsTrend();
		}else if(obj.classList.contains("k")){
			/**
			 * K线类型，参阅接口文档：http://bbs.jctytech.com/index.php/index/stock/readme.html
			 */
			var type = obj.getAttribute("data-type") || "min,1";

			tradeChartObj.classList.remove("trend");
			tradeChartObj.classList.add("k");

			chartState.setChartTypeAsK(type);
		}else{
			console.warn("Unknown chart type to draw");
		}
	};
	[].forEach.call(chartTypeObjs, function(obj){
		Hammer(obj).on("tap", function(){
			selectChartTypeAndDrawChart(obj);
		});
	});

	/* 自动选中第一个 */
	if(chartTypeObjs.length > 0)
		selectChartTypeAndDrawChart(chartTypeObjs[0]);

	// /* 触摸移动动作设置 */
	// Hammer(switchObj).on("tap", (function(){
	// 	var f = function(){
	// 		var currentState = chartState.getTouchMoveAction();
	// 		if(currentState == chartState.TouchMoveActions.VIEW_DETAIL){
	// 			switchObj.setAttribute("data-touch-move-action", "view-detail");
	// 		}else{
	// 			switchObj.setAttribute("data-touch-move-action", "view-history");
	// 		}
	// 	};
	//
	// 	f();
	// 	chartState.addChartTypeChangeListener(f);
	//
	// 	return function(){
	// 		var currentState = chartState.getTouchMoveAction();
	//
	// 		if(currentState == chartState.TouchMoveActions.VIEW_DETAIL){
	// 			chartState.setTouchMoveAction(chartState.TouchMoveActions.VIEW_HISTORY);
	// 			switchObj.setAttribute("data-touch-move-action", "view-history");
	// 		}else{
	// 			chartState.setTouchMoveAction(chartState.TouchMoveActions.VIEW_DETAIL);
	// 			switchObj.setAttribute("data-touch-move-action", "view-detail");
	// 		}
	// 	};
	// })());
})(window);