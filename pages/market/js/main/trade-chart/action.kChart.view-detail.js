;(function(namespace){
	var util = namespace.util;


	var kDetailObj = util.find(".data-detail.k"),
		chartTypeObj = util.find(".chart-type");
	var timeObj = kDetailObj.querySelector(".time"),
		percentageObj = kDetailObj.querySelector(".percentage"),
		amountObj = kDetailObj.querySelector(".amount");
	var openObj = kDetailObj.querySelector(".open-price"),
		highObj = kDetailObj.querySelector(".high-price"),
		lowObj = kDetailObj.querySelector(".low-price"),
		closeObj = kDetailObj.querySelector(".close-price"),
		volumeObj = kDetailObj.querySelector(".volume");

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
			kDetailObj.style.display = "block";
			kDetailObj.style.opacity = "1";
		};

		hideDetailObj = function(immediately){
			if(arguments.length < 1)
				immediately = false;

			clearTimeout(timer);
			kDetailObj.style.opacity = "0";

			var f = function(){kDetailObj.style.display = "none";};
			if(immediately)
				f();
			else
				timer = setTimeout(f, hideAnimationDuration);
		};
	})();

	chartState.addChartTypeChangeListener(function(chartType){
		if(/trend/.test(chartType))
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
	 * 查看K线图明细
	 * @param {Integer} x 以画布左上角为坐标原点，要查看的点相对于原点的水平坐标
	 */
	var viewKDetail = (function(){
		var lastCoordinate = null;

		/**
		 * 移动详细信息对象，使其与指定的水平位置保持一致
		 * @param {Integer} x 手指所在位置的水平位置
		 */
		var moveDetailObjToX = function(x){
			var renderedKChart = namespace.renderedKChart;
			if(null == renderedKChart)
				return;

			var kChartConfig = renderedKChart.getConfig();

			clearTimeout(timerToHideDetailObj);
			showDetailObj();

			var detailObjWidth = kDetailObj.offsetWidth;
			var totalWidth = kDetailObj.parentNode.clientWidth;
			var isOverflow = detailObjWidth + x >= totalWidth;

			var gap = 5;
			if(isOverflow)
				x = x - detailObjWidth - gap;
			else
				x += gap;

			kDetailObj.style.top = kChartConfig.paddingTop + "px";
			//detailObj.style.left = x + "px";
			kDetailObj.style.webkitTransform =
			kDetailObj.style.mozTransform =
			kDetailObj.style.msTransform =
			kDetailObj.style.transform = "translate3d(" + x + "px, 0, 0)";

			timerToHideDetailObj = setTimeout(hideDetailObj, 2000);
		};

		return function(x){
			var renderedKChart = namespace.renderedKChart;
			if(null == renderedKChart)
				return;

			var dataIndex = renderedKChart.getDataIndex(x),
				coordinate = renderedKChart.getCoordinate(x, "center");

			if(null == coordinate)
				return;

			var d = renderedKChart.getOriginalData(dataIndex);
			if(null == d)
				return;

			timeObj.innerHTML = new Date(d.Date * 1000).Format("yyyy-MM-dd HH:mm");
			openObj.innerHTML = Number(d.Open).toFixed(2);
			highObj.innerHTML = Number(d.High).toFixed(2);
			lowObj.innerHTML = Number(d.Low).toFixed(2);
			closeObj.innerHTML = Number(d.Close).toFixed(2);
			if(d.closePriceChangeAmount != null){
				amountObj.innerHTML = Number(d.closePriceChangeAmount).toFixed(2);
				percentageObj.innerHTML = Number(d.closePriceChangeRate * 100).toFixed(2) + "%";
			}else{
				amountObj.innerHTML = "--";
				percentageObj.innerHTML = "--";
			}

			kDetailObj.classList.remove("appreciated");
			kDetailObj.classList.remove("depreciated");
			if(d.closePriceChangeAmount > 0)
				kDetailObj.classList.add("appreciated");
			else if(d.closePriceChangeAmount < 0)
				kDetailObj.classList.add("depreciated");

			var kChartConfig = renderedKChart.getConfig();
			if(kChartConfig.showVolume){
				volumeObj.classList.remove("invisible");
				volumeObj.innerHTML = d.Volume;
			}else{
				volumeObj.classList.add("invisible");
			}

			/* 擦除旧的绘线区域 */
			var x = 0;
			if(null != lastCoordinate){
				x = lastCoordinate.x - 2;
				x = x < 0? 0: x;
			}
			var detailCtx = detailCanvas.getContext("2d");
			detailCtx.clearRect(x, 0, 5, detailCtx.canvas.height);

			/** 竖线 */
			detailCtx.strokeStyle = "#007BA4";
			detailCtx.beginPath();
			var halfGroupBarWidth = TradeChart.chart.KChart.calcHalfGroupBarWidth(renderedKChart.getConfig());
			x = coordinate.x + 0.5;
			detailCtx.moveTo(x, Math.floor(kChartConfig.paddingTop) + 0.5);
			detailCtx.lineTo(x, Math.floor(kChartConfig.height - namespace.kChartConfig.paddingBottom) + 0.5);
			detailCtx.stroke();

			/* 详细信息位置 */
			moveDetailObjToX(x);

			lastCoordinate = coordinate;
		};
	})();

	detailCanvas.addEventListener("touchstart", function(e){
		if(!chartState.isCurrentChartTypeK())
			return;

		var touch = e.touches[0];
		startPosition = {
			x: touch.pageX,
			y: touch.pageY
		};
		viewKDetail(getRelativeX(e));
		e.preventDefault();
	});
	["touchend", "touchcancel"].forEach(function(e){
		detailCanvas.addEventListener(e, function(){
			direction = null;
		});
	});
	detailCanvas.addEventListener("touchmove", function(e){
		if(!chartState.isCurrentChartTypeK())
			return;

		var trendChart = namespace.trendChart,
			renderedTrendChart = namespace.renderedTrendChart;
		if(null == trendChart)
			return;

		if(chartState.getTouchMoveAction() == chartState.TouchMoveActions.VIEW_DETAIL){
			viewKDetail(getRelativeX(e));
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

		var maxCount = TradeChart.chart.KChart.calcMaxGroupCount(chartCanvas, namespace.kChartConfig);
		KChartDataManager.ofSymbolAndType(chartState.getCurrentSymbol(), chartState.getCurrentKChartType()).updateVisibleKDataListEndIndexOffsetFromLatest(maxCount, moveOffset);

		namespace.drawKChart(chartState.getCurrentSymbol(), chartState.getCurrentKChartType());
		hideDetailObj(true);
	});
})(window);