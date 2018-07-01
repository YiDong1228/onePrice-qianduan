;(function(namespace){
	var chartState = namespace.chartState,
		drawTrendChart = namespace.drawTrendChart,
		drawKChart = namespace.drawKChart;

	var switchObj = util.find(".chart-container .switch");

	var drawChart = function(){
		if(chartState.isCurrentChartTypeTrend()){
			drawTrendChart(chartState.getCurrentSymbol());
		}else if(chartState.isCurrentChartTypeK())
			drawKChart(chartState.getCurrentSymbol(), chartState.getCurrentKChartType());
		else
			console.warn("Unknown chart type: " + chartState.getCurrentChartType());
	};

	chartState.addChartTypeChangeListener(function(chart){
		console.debug("Chart type changes to " + chart);
		drawChart();

		chartState.setTouchMoveAction(chartState.TouchMoveActions.VIEW_HISTORY);
	});
	chartState.addSymbolChangeListener(function(symbol){
		console.debug("Symbol changes to " + symbol);
		drawChart();

		chartState.setTouchMoveAction(chartState.TouchMoveActions.VIEW_HISTORY);
	});

	chartState.setTouchMoveAction(chartState.TouchMoveActions.VIEW_HISTORY);
})(window);