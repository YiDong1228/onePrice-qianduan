;(function(namespace){
	var util = namespace.util,
		KChartDataManager = namespace.KChartDataManager;


	var kDetailObj = util.find(".data-detail.k");
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

	/** 渲染配置 */
	namespace.kChartConfig = {
		width: "100%",/* 整体图形宽度 */
		height: "100%",/* 整体图形高度 */

		/** 图形内边距（坐标系外边距） */
		paddingTop: 5,
		paddingBottom: 0,
		paddingLeft: 6,
		paddingRight: 6,

		groupLineWidth: 1,/** 蜡烛线的宽度。最好为奇数，从而使得线可以正好在正中间 */
		groupBarWidth: 5,/** 蜡烛的宽度，必须大于等于线的宽度+2。最好为奇数，从而使得线可以正好在正中间 */
		groupGap: 2,/** 相邻两组数据之间的间隔 */

		axisLabelColor: "#5C6283",/** 坐标标签颜色 */
		axisLineColor: "#61688A",/** 坐标轴及刻度线条颜色 */

		gridLineDash: [1],/** 网格横线的虚线构造方法。如果需要用实线，则用“[1]”表示 */
		horizontalGridLineColor: "#0D1213",/** 网格横线颜色 */
		verticalGridLineColor: "#0D1213",/** 网格竖线颜色 */

		axisTickLineLength: 6,/* 坐标轴刻度线的长度 */
		axisLabelOffset: 5,/* 坐标标签距离坐标轴刻度线的距离 */
		axisLabelFont: null,

		showAxisXLine: false,/** 是否绘制横坐标轴 */
		axisXTickOffset: 0,/* 横坐标刻度距离原点的位移 */
		axisXTickOffsetFromRight: 0,
		axisXLabelPosition: "beneath-trend-above-volume",/** 横坐标标签位置 */
		axisXLabelSize: 100,/* 横坐标标签文字的长度（用于决定以何种方式绘制最后一个刻度：只绘制边界刻度，还是边界刻度和最后一个刻度都绘制） */
		axisXLabelGenerator: function(convertedData, index, previousContvertedData, nextConvertedData){/* 横坐标标签文字的输出方法 */
			var date = new Date(convertedData.time);
			var s = date.Format("MM-dd HH:mm");

			return s;
		},
		axisXLabelHorizontalAlign: function(i, n){/** 横坐标标签的水平对齐方式。start：左对齐；center：居中；end：右对齐 */
			return i == 0? "start": (i == n - 1? "end": "center");
		},

		showAxisYLine: false,/** 是否绘制纵坐标轴 */
		axisYPosition: "left",/** 纵坐标位置。left：左侧；right：右侧 */
		axisYMidTickQuota: 0,/** 纵坐标刻度个数（不包括最小值和最大值） */
		axisYLabelOffset: 2,/* 纵坐标标签距离坐标轴刻度线的距离 */
		axisYLabelPosition: "inside",/** 纵坐标标签位置。outside：外侧；inside：内侧 */
		axisYLabelVerticalOffset: function(i, n){/** 纵坐标标签纵向位移 */
			return i == 0? -10: (i == n - 1? 10: 0);
		},

		axisYPrecision: 0,/** 纵坐标的数字精度 */
		axisYPriceFloorLabelFont: "bold 16px 'Microsoft Yahei'",/** 纵坐标最小值的坐标标签字体 */
		axisYPriceFloorLabelColor: "#8AC272",/** 纵坐标最小值的坐标标签颜色 */
		axisYPriceCeilingLabelFont: "bold 16px 'Microsoft Yahei'",/** 纵坐标最小值的坐标标签字体 */
		axisYPriceCeilingLabelColor: "#B65059",/** 纵坐标最小值的坐标标签颜色 */
		axisYTickOffset: 10,/* 纵坐标刻度距离原点的位移 */

		appreciatedColor: "#69121B",/** 收盘价大于开盘价时的绘制蜡烛和线时用的画笔和油漆桶颜色 */
		depreciatedColor: "#0A5612",/** 收盘价小于开盘价时的绘制蜡烛和线时用的画笔和油漆桶颜色 */
		keepedColor: "#999999",/** 收盘价等于开盘价时的绘制蜡烛和线时用的画笔和油漆桶颜色 */

		coordinateBackground: "transparent",

		showVolume: true,  /** 是否显示量图 */
		volumeWidth: 3, /** 量图每个柱状图的宽度。最好为奇数，从而使得线可以正好在正中间*/
		axisYVolumeFloor: 0, /** 纵坐标最小刻度 */
		volumeMarginTop: 25,/** 量图区的顶部外边距 （即与图形区的间距）*/
		volumeAxisYTickOffset: 10, /** 量图纵坐标刻度距离原点的位移 */
		volumeAxisYMidTickQuota: 0, /** 量图纵坐标刻度个数（不包括最小值和最大值） */
		volumeAxisYLabelVerticalOffset: function(i, n){/** 纵坐标标签纵向位移 */
			return i == 0? -5: (i == n - 1? 5: 0);
		},
		volumeColor: "#3a3f5b", /** 量图颜色（柱状图）*/
		appreciatedVolumeColor: "#69121B",/** 收盘价大于开盘价时，绘制量图用的画笔或油漆桶颜色 */
		depreciatedVolumeColor: "#0A5612",/** 收盘价小于开盘价时，绘制量图用的画笔或油漆桶颜色 */

		showMAArr: [5, 10, 20, 30], /** 要显示的MA线 */
		MALabelX: 100, /** MA标题的起始位置横坐标 */
		MALabelY: 5, /** MA标题的起始位置纵坐标 */
		MAColorArr: ["#965FC4", "#84AAD5", "#55B263", "#B7248A"] /** 每条MA线对应的颜色 */
	};

	/**
	 * K线数据的转换方法（转换为绘图组件所需要的格式化数据）
	 */
	var dataParser4OriginalData = function(d, i){
		try{
			return {
				time: (+d.Date) * 1000,
				openPrice: +d.Open,
				highPrice: +d.High,
				lowPrice: +d.Low,
				closePrice: +d.Close,
				volume: +d.Volume,
				MA5: util.isEmptyString(d.ma5, true)? null: +d.ma5,
				MA10: util.isEmptyString(d.ma10, true)? null: +d.ma10,
				MA20: util.isEmptyString(d.ma20, true)? null: +d.ma20,
				MA30: util.isEmptyString(d.ma30, true)? null: +d.ma30
			};
		}catch(e){
			console.error("Fail to parse original k data", d);
			throw e;
		}
	};

	/**
	 * 根据给定的K线图数据列表，结合视图配置中指定的数据精度，返回最终渲染到界面上的数据精度
	 * @param {Array#JsonObject} dataList 完整的行情数据
	 */
	var getKChartDataPrecision = function(dataList){
		var realPrecision = 0,
			minPrecision = 0,
			maxPrecision = 4;

		var arr = "openPrice, highPrice, lowPrice, closePrice".split(/\s*,\s*/);

		dataList = dataList || [];
		dataList.forEach(function(d){
			d = dataParser4OriginalData(d);

			arr.forEach(function(p){
				var tmp = String(d[p]).split(".");
				tmp = null == tmp || tmp.length < 2? 0: tmp[1].length;
				realPrecision = Math.max(realPrecision, tmp);
			});
		});

		realPrecision = Math.min(realPrecision, maxPrecision);
		realPrecision = Math.max(realPrecision, minPrecision);

		return realPrecision;
	};

	/**
	 * 绘制指定产品代码的K线图
	 * @param {String} symbol 产品代码
	 * @param {String} kType K线类型
	 * @param {Function} [callback] 绘制完成后执行的方法
	 */
	var drawKChart = function(symbol, kType, callback){
		/* 单屏能显示的数据量 */
		var maxCount = TradeChart.chart.KChart.calcMaxGroupCount(chartCanvas, namespace.kChartConfig);
		var renderedKChart,
			kChart = new TradeChart.chart.KChart();

		if(util.isEmptyString(symbol, true) || util.isEmptyString(kType, true)){
			console.warn("Skip drawing k chart in that symbol or k type is null");
			return;
		}

		console.debug("Drawing k chart for symbol: " + symbol + ", type: " + kType);

		/**
		 * 根据给定数据执行图形渲染
		 * @param {Array#JsonObject} dataList K线图数据列表
		 */
		var doRender = function(dataList){
			var precision = getKChartDataPrecision(dataList);

			kChart.setDatas(dataList);
			var _config = util.cloneObject(namespace.kChartConfig, true);
			_config.axisYPrecision = precision;

			try{
				renderedKChart = kChart.render(chartCanvas, _config);
				namespace.renderedKChart = renderedKChart;
			}catch(e){
				console.error("Fail to draw k chart for symbol: " + symbol, e, e.stack);
				return;
			}

			/* 设置明细查看相关参数 */
			setDetailOptions();
		};

		kChart.setDataParser(dataParser4OriginalData);

		KChartDataManager.ofSymbolAndType(symbol, kType).getVisibleKDataList(null, {
			callback: function(list){
				list = list || [];

				var count = Math.min(list.length, maxCount);
				list = list.slice(list.length - count);

				doRender(list);
				callback && callback();
			},
			action4NoMoreEarlierData: function(){
				console.log("No more data.");
			}
		});

		namespace.kChart = kChart;
	};

	/**
	 * 绘制图形后，设置明细查看相关参数
	 */
	var setDetailOptions = function(){
		var renderedKChart = namespace.renderedKChart;
		if(null == renderedKChart)
			return;

		/* 明细查看 */
		var renderMetadata = renderedKChart.getRenderMetadata();
		detailCanvas.width = chartCanvas.width;
		detailCanvas.height = chartCanvas.height;
		detailCanvas.style.width = renderMetadata.cssWidth + "px";
		detailCanvas.style.height = renderMetadata.cssHeight + "px";

		var detailCtx = detailCanvas.getContext("2d");
		detailCtx.scale(renderMetadata.scaleX, renderMetadata.scaleY);
		detailCtx.strokeStyle = "black";
		detailCtx.lineWidth = 0.5;
	};

	namespace.drawKChart = drawKChart;
})(window);
