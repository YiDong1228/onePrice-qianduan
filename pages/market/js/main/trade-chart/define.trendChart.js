;(function(namespace){
	var util = namespace.util,
		TrendChartDataManager = namespace.TrendChartDataManager;

	var trendDetailObj = util.find(".data-detail.trend");
	var timeObj = trendDetailObj.querySelector(".time"),
		priceObj = trendDetailObj.querySelector(".price"),
		avgPriceObj = trendDetailObj.querySelector(".avgPrice"),
		volumeObj = trendDetailObj.querySelector(".volume");

	var chartCanvas = util.find(".chart-container canvas.chart"),
		detailCanvas = util.find(".chart-container canvas.detail");

	/** 渲染配置 */
	namespace.trendChartConfig = {
		width: "100%",/* 整体图形宽度 */
		height: "100%",/* 整体图形高度 */

		/** 图形内边距（坐标系外边距） */
		paddingTop: 5,
		paddingBottom: 0,
		paddingLeft: 6,
		paddingRight: 6,

		dotGap: 2,/** 相邻两个点之间的间隔, 最好为偶数 */

		axisLabelColor: "#5C6283",/** 坐标标签颜色 */
		axisLineColor: "#61688A",/** 坐标轴及刻度线条颜色 */

		axisTickLineLength: 6,/* 坐标轴刻度线的长度 */
		axisLabelOffset: 5,/* 坐标标签距离坐标轴刻度线的距离 */
		axisLabelFont: null,

		showAxisXLine: false,/** 是否绘制横坐标轴 */
		showAxisXLabel: true,/** 是否绘制横坐标刻度值 */
		axisXTickOffset: 0,/* 横坐标刻度距离原点的位移 */
		axisXTickOffsetFromRight: 0,
		axisXLabelPosition: "beneath-trend-above-volume",/** 横坐标标签位置 */
		axisXLabelSize: 70,/* 横坐标标签文字的长度（用于决定以何种方式绘制最后一个刻度：只绘制边界刻度，还是边界刻度和最后一个刻度都绘制） */
		axisXLabelGenerator: function(convertedData, index, previousContvertedData, nextConvertedData){/* 横坐标标签文字的输出方法 */
			var date = new Date(convertedData.time);
			var s = date.Format("MM-dd HH:mm");
			var d = s.substring(0, 5),
				t = s.substring(6);

			return t;

			// var isInTheSameDay = null != previousContvertedData && new Date(previousContvertedData.time).Format("MM-dd") == d;
			// if(index == 0 || !isInTheSameDay)
			// 	return s;
			// return t;
		},
		axisXLabelHorizontalAlign: function(i, n){/** 横坐标标签的水平对齐方式。start：左对齐；center：居中；end：右对齐 */
			return i == 0? "start": (i == n - 1? "end": "center");
		},

		showAxisYLine: false,/** 是否绘制纵坐标轴 */
		axisYPosition: "left",/** 纵坐标位置。left：左侧；right：右侧 */
		axisYTickOffset: 10,/* 纵坐标刻度距离原点的位移 */
		axisYMidTickQuota: 0,/** 纵坐标刻度个数（不包括最小值和最大值） */
		axisYLabelPosition: "inside",/** 纵坐标标签位置。outside：外侧；inside：内侧 */
		axisYLabelOffset: 2,/* 纵坐标标签距离坐标轴刻度线的距离 */
		axisYLabelVerticalOffset: function(i, n){/** 纵坐标标签纵向位移 */
			return i == 0? -10: (i == n - 1? 10: 0);
		},
		axisYPrecision: 0,/** 纵坐标的数字精度 */
		axisYPriceFloorLabelFont: "bold 16px 'Microsoft Yahei'",/** 纵坐标最小值的坐标标签字体 */
		axisYPriceFloorLabelColor: "#8AC272",/** 纵坐标最小值的坐标标签颜色 */
		axisYPriceCeilingLabelFont: "bold 16px 'Microsoft Yahei'",/** 纵坐标最小值的坐标标签字体 */
		axisYPriceCeilingLabelColor: "#B65059",/** 纵坐标最小值的坐标标签颜色 */

		gridLineDash: [1],/** 网格横线的虚线构造方法。如果需要用实线，则用“[1]”表示 */
		horizontalGridLineColor: "#0D1213",/** 网格横线颜色 */
		verticalGridLineColor: "#0D1213",/** 网格竖线颜色 */

		lineWidth: 0.5,/** 折线线宽 */
		lineColor: "#DCDFE2",/** 折线颜色 */

		coordinateBackground: "transparent",
		enclosedAreaBackground: "rgba(38,41,56,0.5)",

		showVolume: true,  /** 是否显示量图 */
		volumeWidth: 5, /** 量图每个柱状图的宽度。最好为奇数，从而使得线可以正好在正中间*/
		axisYVolumeFloor: 0, /** 纵坐标最小刻度 */
		volumeMarginTop: 25,/** 量图区的顶部外边距 （即与图形区的间距）*/
		volumeAxisYTickOffset: 10, /** 量图纵坐标刻度距离原点的位移 */
		volumeAxisYMidTickQuota: 0, /** 量图纵坐标刻度个数（不包括最小值和最大值） */
		volumeColor: "#3a3f5b", /** 量图颜色（柱状图）, 可以为数组 */
		volumeAxisYLabelVerticalOffset: function(i, n){/** 纵坐标标签纵向位移 */
			return i == 0? -5: (i == n - 1? 5: 0);
		},
		appreciatedVolumeColor: "#0A5612",/** 收盘价大于开盘价时，绘制量图用的画笔或油漆桶颜色 */
		depreciatedVolumeColor: "#69121B",/** 收盘价小于开盘价时，绘制量图用的画笔或油漆桶颜色 */

		lastClosingPrice: null,/** 昨日收盘价 */
		showLastClosingPriceLine: true,/** 是否显示昨日收盘价对应的线条（简称：昨日收盘线） */
		showLastClosingPriceLine_lineWidth: 0.5,/** 昨日收盘线线宽 */
		showLastClosingPriceLine_lineColor: "#595F6C",/** 昨日收盘线线条颜色 */
		showLastClosingPriceLine_lineDash: [2, 2],/** 昨日收盘线线条的虚线构造方法。如果需要用实线，则用“[1]”表示 */

		showAvgPriceLine: true, /** 是否显示均线 */
		avgPriceLineColor: "#735845" /** 均线颜色 */
	};

	/**
	 * 分时图数据的转换方法（转换为绘图组件所需要的格式化数据）
	 */
	var dataParser4OriginalData = function(d, i, list){
		try{
			var obj = {
				time: +d.Date * 1000,
				price: +d.Trend,
				openPrice: +d.Trend,
				closePrice: +d.LastClose,
				volume: +d.Volume,
				avgPrice: +d.Average
			};

			if(isNaN(obj.price))
				obj.price = 0;
			if(isNaN(obj.avgPrice))
				obj.avgPrice = 0;

			return obj;
		}catch(e){
			console.error("Fail to parse original trend data", d);
			throw e;
		}
	};

	/**
	 * 根据给定的分时图数据列表，结合视图配置中指定的数据精度，返回最终渲染到界面上的数据精度
	 * @param {Array#JsonObject} dataList 完整的行情数据
	 */
	var getTrendChartDataPrecision = function(dataList){
		var realPrecision = 0,
			minPrecision = 0,
			maxPrecision = 4;

		dataList = dataList || [];
		dataList.forEach(function(d){
			d = dataParser4OriginalData(d);

			var tmp = String(d.Trend).split(".");
			tmp = null == tmp || tmp.length < 2? 0: tmp[1].length;
			realPrecision = Math.max(realPrecision, tmp);
		});

		realPrecision = Math.min(realPrecision, maxPrecision);
		realPrecision = Math.max(realPrecision, minPrecision);

		return realPrecision;
	};

	/**
	 * 获取分时图数据
	 * @param {String} symbol 产品代码
	 * @param {Function} onsuccess 获取成功后执行的方法
	 * @param {Function} onerror 获取失败时执行的方法
	 */
	var getTrendChartData = function(symbol, date, onsuccess, onerror){
		var url = "http://dt.jctytech.com/stock.php?a=1&u=17305&sign=86469c04bda0a04b9f26a2b458134cb4&stamp=1525435040897&type=trend&symbol=" + symbol;
		if(null != date && (date = String(date).trim()) != "")
			url += "&date=" + date;

		var xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.onreadystatechange = function(){
			if(this.readyState != 4)
				return;

			var responseText = this.responseText;
			if(this.status != 200)
				return onerror && onerror(this.status, responseText);

			try{
				var resp = JSON.parse(responseText);
			}catch(e){
				console.error("Invalid response while retrieving trend chart data");
				return;
			}

			onsuccess && onsuccess(resp);
		};
		xhr.send();
	};

	/**
	 * 获取给定产品代码的昨收盘价
	 * @param {String} symbol 产品代码
	 * @param {Function} callback 回调方法
	 */
	var getLastClosingPrice = (function(){
		var cache = {};

		var NOT_SUPPLIED = {};
		var age = 1 * 60 * 1000;

		var ofSymbol = function(symbol){
			cache[symbol] = cache[symbol] || {
				lastClosingPrice: NOT_SUPPLIED,
				lastUpdateTimestamp: NOT_SUPPLIED,
			};

			return cache[symbol];
		};

		return function(symbol, callback){
			var c = ofSymbol(symbol);
			if(NOT_SUPPLIED != c.lastClosingPrice && (Date.now() - c.lastUpdateTimestamp <= age))
				return callback(c.lastClosingPrice);

			getTrendChartData(symbol, null, function(resp){
				c.lastClosingPrice = resp.LastClose;
				c.lastUpdateTimestamp = Date.now();

				callback(c.lastClosingPrice);
			}, function(status, text){
				console.error(status, text);
				callback(0);
			});
		};
	})();

	/**
	 * 绘制指定产品代码的分时图
	 * @param {String} symbol 产品代码
	 * @param {Function} [callback] 绘制完成后执行的方法
	 */
	var drawTrendChart = (function(){
		var latestSymbol = null;
		return function(symbol, callback){
			if(null == symbol || (symbol = String(symbol).trim()) == ""){
				if(null != latestSymbol)
					symbol = latestSymbol;
			}else
				latestSymbol = symbol;

			if(util.isEmptyString(symbol, true)){
				console.warn("Skip drawing trend chart in that symbol is null");
				return;
			}

			console.debug("Drawing trend chart for symbol: " + symbol);

			/* 单屏能显示的数据量 */
			var maxCount = TradeChart.chart.TrendChart.calcMaxDotCount(chartCanvas, namespace.trendChartConfig);
			var renderedTrendChart,
				trendChart = new TradeChart.chart.TrendChart();

			/**
			 * 根据给定数据执行图形渲染
			 * @param {Array#JsonObject} dataList 分时图数据列表
			 * @param {Float} lastClosingPrice 昨日收盘价
			 */
			var doRender = function(dataList, lastClosingPrice){
				var precision = getTrendChartDataPrecision(dataList);

				trendChart.setDatas(dataList);
				var _config = util.cloneObject(namespace.trendChartConfig, true);
				_config.axisYPrecision = precision;
				_config.lastClosingPrice = lastClosingPrice;

				try{
					renderedTrendChart = trendChart.render(chartCanvas, _config);
					namespace.renderedTrendChart = renderedTrendChart;
				}catch(e){
					console.error("Fail to draw trend chart for symbol: " + symbol, e, e.stack);
					return;
				}

				/* 设置明细查看相关参数 */
				setDetailOptions();
			};

			trendChart.setDataParser(dataParser4OriginalData);

			var p1 = new Promise(function(resolve, reject){
				getLastClosingPrice(symbol, function(lastClosingPrice){
					resolve(lastClosingPrice);
				});
			});
			var p2 = new Promise(function(resolve, reject){
				TrendChartDataManager.ofSymbol(symbol).getVisibleTrendDataList(null, {
					callback: function(list){
						list = list || [];

						var count = Math.min(list.length, maxCount);
						list = list.slice(list.length - count);

						resolve(list);
					},
					action4NoMoreEarlierData: function(){
						console.log("No more data.");
					}
				});
			});
			Promise.all([p1, p2]).then(function(datas){
				var lastClosingPrice = datas[0],
					list = datas[1];

				doRender(list, lastClosingPrice);
				callback && callback();
			});


			namespace.trendChart = trendChart;
		};
	})();

	/**
	 * 绘制图形后，设置明细查看相关参数
	 */
	var setDetailOptions = function(){
		var renderedTrendChart = namespace.renderedTrendChart;
		if(null == renderedTrendChart)
			return;

		/* 明细查看 */
		var renderMetadata = renderedTrendChart.getRenderMetadata();
		detailCanvas.width = chartCanvas.width;
		detailCanvas.height = chartCanvas.height;
		detailCanvas.style.width = renderMetadata.cssWidth + "px";
		detailCanvas.style.height = renderMetadata.cssHeight + "px";

		var detailCtx = detailCanvas.getContext("2d");
		detailCtx.scale(renderMetadata.scaleX, renderMetadata.scaleY);
		detailCtx.strokeStyle = "black";
		detailCtx.lineWidth = 0.5;
	};

	namespace.drawTrendChart = drawTrendChart;
})(window);