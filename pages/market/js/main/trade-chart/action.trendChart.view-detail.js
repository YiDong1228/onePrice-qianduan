;(function(namespace){
	var util = namespace.util,
		chartState = namespace.chartState;

	var trendDetailObj = util.find(".data-detail.trend"),
		chartTypeObj = util.find(".chart-type");
	var timeObj = trendDetailObj.querySelector(".time"),
		priceObj = trendDetailObj.querySelector(".price"),
		avgPriceObj = trendDetailObj.querySelector(".avgPrice"),
		volumeObj = trendDetailObj.querySelector(".volume");

	var chartCanvas = util.find(".chart-container canvas.chart"),
		detailCanvas = util.find(".chart-container canvas.detail");

	var startPosition, endPosition;

	/* 当前手指位移记录 */
	var deltaX, deltaY, direction = null;

	/* 自动隐藏详细信息对象的定时器 */
	var timerToHideDetailObj;

	/** 显示/隐藏详细信息对象 */
	var showDetailObj, hideDetailObj;
	(function(){
		var hideAnimationDuration = 100;
		var timer;

		showDetailObj = function(){
			clearTimeout(timerToHideDetailObj);
			trendDetailObj.style.display = "block";
			trendDetailObj.style.opacity = "1";
		};

		hideDetailObj = function(immediately){
			if(arguments.length < 1)
				immediately = false;

			clearTimeout(timer);
			trendDetailObj.style.opacity = "0";

			var f = function(){trendDetailObj.style.display = "none";};
			if(immediately)
				f();
			else
				timer = setTimeout(f, hideAnimationDuration);
		};
	})();

	chartState.addChartTypeChangeListener(function(chartType){
		if(!/trend/.test(chartType))
			hideDetailObj(true);
	});

	/**
	 * 根据提供的事件，获取对应到画布上的水平位移
	 * @param {Event} e 事件
	 */
	var getRelativeX = (function(){
		var offsetLeft = detailCanvas.offsetLeft;

		return function(e){
			var x = e instanceof TouchEvent? e.touches[0].clientX - offsetLeft: e.offsetX;
			return x;
		};
	})();

	/**
	 * 查看分时图明细
	 * @param {Integer} x 以画布左上角为坐标原点，要查看的点相对于原点的水平坐标
	 */
	var viewTrendDetail = (function(){
		var lastCoordinate = null;

		/**
		 * 移动详细信息对象，使其与指定的水平位置保持一致
		 * @param {Integer} x 手指所在位置的水平位置
		 */
		var moveDetailObjToX = function(x){
			var renderedTrendChart = namespace.renderedTrendChart;
			if(null == renderedTrendChart)
				return;

			var trendChartConfig = renderedTrendChart.getConfig();

			clearTimeout(timerToHideDetailObj);
			showDetailObj();

			var detailObjWidth = trendDetailObj.offsetWidth;
			var totalWidth = trendDetailObj.parentNode.clientWidth;
			var isOverflow = detailObjWidth + x >= totalWidth;

			var gap = 5;
			if(isOverflow)
				x = x - detailObjWidth - gap;
			else
				x += gap;

			trendDetailObj.style.top = trendChartConfig.paddingTop + "px";
			//detailObj.style.left = x + "px";
			trendDetailObj.style.webkitTransform =
			trendDetailObj.style.mozTransform =
			trendDetailObj.style.msTransform =
			trendDetailObj.style.transform = "translate3d(" + x + "px, 0, 0)";

			timerToHideDetailObj = setTimeout(hideDetailObj, 2000);
		};

		return function(x){
			var renderedTrendChart = namespace.renderedTrendChart;
			if(null == renderedTrendChart)
				return;

			var dataIndex = renderedTrendChart.getDataIndex(x),
				coordinate = renderedTrendChart.getCoordinate(x);

			if(null == coordinate)
				return;

			var d = renderedTrendChart.getOriginalData(dataIndex);
			if(null == d)
				return;

			var trendChartConfig = renderedTrendChart.getConfig();

			timeObj.innerHTML = new Date(d.Date * 1000).Format("yyyy-MM-dd HH:mm");
			if(d.Trend != null){
				priceObj.innerHTML = Number(d.Trend).toFixed(2);
			}else{
				priceObj.innerHTML = Number(d.LastClose).toFixed(2);
			}
			if(trendChartConfig.showAvgPriceLine && d.Average != null){
				avgPriceObj.classList.remove("invisible");
				avgPriceObj.innerHTML = Number(d.Average).toFixed(2);
			}else{
				avgPriceObj.classList.add("invisible");
			}

			if(trendChartConfig.showVolume && d.Volume != null){
				volumeObj.classList.remove("invisible");
				volumeObj.innerHTML = d.Volume;
			}else{
				volumeObj.classList.add("invisible");
			}

			/* 擦除旧的绘线区域 */
			var x = 0, y = 0;
			if(null != lastCoordinate){
				x = lastCoordinate.x - 2;
				y = lastCoordinate.y - 2;
				x = x < 0? 0: x;
				y = y < 0? 0: y;
			}
			var detailCtx = detailCanvas.getContext("2d");
			detailCtx.clearRect(0, y, detailCtx.canvas.width, 5);
			detailCtx.clearRect(x, 0, 5, detailCtx.canvas.height);

			var x1 = Math.floor(trendChartConfig.paddingLeft) + 0.5,
				x2 = Math.floor(trendChartConfig.width - trendChartConfig.paddingRight) + 0.5;
			y = Math.floor(coordinate.y) + 0.5;

			/** 横线 */
			detailCtx.strokeStyle = "#007BA4";
			detailCtx.beginPath();
			detailCtx.moveTo(x1, y);
			detailCtx.lineTo(x2, y);

			/** 竖线 */
			x = Math.floor(coordinate.x) + 0.5;
			detailCtx.moveTo(x, Math.floor(trendChartConfig.paddingTop) + 0.5);
			detailCtx.lineTo(x, Math.floor(trendChartConfig.height - trendChartConfig.paddingBottom) + 0.5);
			detailCtx.stroke();

			/** 圆点 */
			detailCtx.fillStyle = "#007BA4";
			detailCtx.beginPath();
			detailCtx.moveTo(x, y);
			detailCtx.arc(x, y, 3, 2 * Math.PI, 0);
			detailCtx.closePath();
			detailCtx.fill();

			/* 详细信息位置 */
			moveDetailObjToX(x);

			lastCoordinate = coordinate;
		};
	})();

	detailCanvas.addEventListener("touchstart", function(e){
		if(!chartState.isCurrentChartTypeTrend())
			return;

		var touch = e.touches[0];
		startPosition = {
			x: touch.pageX,
			y: touch.pageY
		};
		viewTrendDetail(getRelativeX(e));
		e.preventDefault();
	});
	["touchend", "touchcancel"].forEach(function(e){
		detailCanvas.addEventListener(e, function(){
			direction = null;
		});
	});
	detailCanvas.addEventListener("touchmove", function(e){
		if(!chartState.isCurrentChartTypeTrend())
			return;

		var trendChart = namespace.trendChart,
			renderedTrendChart = namespace.renderedTrendChart;
		if(null == trendChart)
			return;

		console.log(chartState.getTouchMoveAction());
		if(chartState.getTouchMoveAction() == chartState.TouchMoveActions.VIEW_DETAIL){
			viewTrendDetail(getRelativeX(e));
			return;
		}

		var touch = e.touches[0];
		endPosition = {
			x: touch.pageX,
			y: touch.pageY
		};

		var moveOffset = Math.round((endPosition.x - startPosition.x) / namespace.trendChartConfig.dotGap);
		startPosition = endPosition;

		if(moveOffset == 0)
			return;

		var maxCount = TradeChart.chart.TrendChart.calcMaxDotCount(chartCanvas, namespace.trendChartConfig);
		TrendChartDataManager.ofSymbol(chartState.getCurrentSymbol()).updateVisibleTrendDataListEndIndexOffsetFromLatest(maxCount, moveOffset);

		namespace.drawTrendChart(chartState.getCurrentSymbol());
		hideDetailObj(true);
	});
})(window);