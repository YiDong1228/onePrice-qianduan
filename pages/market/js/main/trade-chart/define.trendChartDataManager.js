;(function(namespace){
	var util = namespace.util;


	/**
	 * 刷新分时图数据时，相邻两次刷新操作之间的时间间隔。单位：毫秒
	 * @type {Number}
	 */
	var refreshGap = 2000;

	var maxPageSize = 300;


	/**
	 * @typedef {Object} TrendData
	 */

	/**
	 * 获取分时图数据
	 * @param {String} symbol 产品代码
	 * @param {Function} onsuccess 获取成功后执行的方法
	 * @param {Function} onerror 获取失败时执行的方法
	 */
	var getTrendChartData = function(symbol, date, onsuccess, onerror){
		var url = "http://dt.jctytech.com/stock.php?u=17305&sign=86469c04bda0a04b9f26a2b458134cb4&stamp=1525435040897&type=trend&symbol=" + symbol;
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
	 * 以既有的分时图数据为基准，过滤给定的分时图数据列表，使其移除重复的数据
	 * @param {TrendData[]} baseList 既有的分时图数据
	 * @param {TrendData[]} list 待过滤重复数据的分时图数据列表
	 */
	var filterDuplicateTrendData = function(baseList, list){
		if(!Array.isArray(baseList) || !Array.isArray(list))
			return list;

		return list.filter(function(d){
			return !baseList.some(function(k){
				return k.Date == d.Date;
			});
		});
	};

	/**
	 * 将给定的分时图数据融合至目标列表中。如果不存在，则按顺序插入，否则覆盖既有取值
	 * @param {TrendData[]} targetList 目标列表
	 * @param {TrendData[]} list 待融合的列表
	 * @returns {TrendData[]}
	 */
	var mergeTrendDataList = function(targetList, list){
		targetList = targetList || [];
		list = list || [];

		/* 按照时间升序排序 */
		targetList = targetList.sort(function(a, b){
			return a.Date > b.Date? 1: -1;
		});

		list.forEach(function(m){
			var existingIndex = -1;
			for(var i = 0; i < targetList.length; i++)
				if(targetList[i].Date == m.Date){
					existingIndex = i;
					break;
				}

			if(-1 != existingIndex){
				targetList[existingIndex] = m;
			}else{
				var index1 = null,/* 最大的，小于目标的索引 */
					index2 = null;/* 最小的，大于目标的索引 */
				for(var i = 0; i < targetList.length; i++){
					var sec = targetList[i].Date;
					if(sec > m.Date && null == index2)
						index2 = i;
					if(sec <= m.Date)
						index1 = i;
				}

				if(index1 == null)
					targetList.unshift(m);
				else if(index2 == null)
					targetList.push(m);
				else
					targetList = targetList.slice(0, index1 + 1).concat(m).concat(targetList.slice(index2));
			}
		});

		return targetList;
	};

	var strigifyTrendDataList = function(list){
		return list.map(function(t){
			return t.Date;
		});
	};

	/**
	 * 分时图数据容器
	 * @param {String} symbol 产品代码
	 * @constructor
	 */
	var TrendChartData = function(symbol){
		Object.defineProperty(this, "symbol", {value: symbol, configurable: false, writable: false});

		/* 分时图数据 */
		var dataList = [];

		/**
		 * 可见数据的结束索引距离时间最晚的分时图数据的位移
		 * @type {number}
		 */
		var visibleListEndIndexOffsetFromLatest = 0;

		/**
		 * 最新的分时图数据发生变化时执行的方法
		 * @type {Function[]}
		 */
		var latestTrendDataChangeListeners = [];

		/**
		 * 最新的分时图数据刷新定时器
		 */
		var refreshTimer = null;


		/**
		 * 获取分时图数据列表（自动消除重复数据）
		 * @returns {TrendData[]}
		 */
		this.getTrendDataList = function(){
			return dataList;
		};

		/**
		 * 添加监听器：“最新的分时图数据发生变化”
		 * @param {Function} listener 要添加的监听器
		 * @param {Boolean} [trigggerOnlyWhenLatestTrendDataIsVisible=false] 是否仅当最新分时图数据可见时才出发
		 * @returns {TrendChartData}
		 */
		this.addLatestTrendDataChangeListener = function(listener, trigggerOnlyWhenLatestTrendDataIsVisible){
			if(latestTrendDataChangeListeners.indexOf(listener) != -1)
				return this;

			if(arguments.lenth < 2)
				trigggerOnlyWhenLatestTrendDataIsVisible = false;

			listener.trigggerOnlyWhenLatestTrendDataIsVisible = trigggerOnlyWhenLatestTrendDataIsVisible;/* 暂存标记，供调用使用 */
			latestTrendDataChangeListeners.push(listener);
			return this;
		};

		/**
		 * 移除监听器：“最新的分时图数据发生变化”
		 * @param {Function} listener 要移除的监听器
		 * @returns {TrendChartData}
		 */
		this.removeLatestTrendDataChangeListener = function(listener){
			var index = latestTrendDataChangeListeners.indexOf(listener);
			if(index == -1)
				return this;

			latestTrendDataChangeListeners.splice(index, 1);
			return this;
		};

		/**
		 * 在既有数据列表的末尾追加给定的分时图数据
		 * @param {TrendData[]} list 要在末尾处追加的分时图数据
		 * @returns {TrendChartData}
		 */
		this.appendTrendDataList = function(list){
			if(!Array.isArray(list))
				return this;

			var oldLen = dataList.length;
			dataList = mergeTrendDataList(dataList, list);

			var newLen = dataList.length;
			var lenDelta = newLen - oldLen;

			/* 保持可见数据的一致性。等于0时，表示没有位移，需要继续保持为“没有位移” */
			if(visibleListEndIndexOffsetFromLatest > 0)
				visibleListEndIndexOffsetFromLatest += lenDelta;

			return this;
		};

		/**
		 * 在既有数据列表的开始位置追加给定的分时图数据
		 * @param {TrendData[]} list 要在开始位置追加的分时图数据
		 * @returns {TrendChartData}
		 */
		this.prependTrendDataList = function(list){
			if(!Array.isArray(list))
				return this;

			// console.debug("New list before prepend", strigifyTrendDataList(dataList));
			dataList = mergeTrendDataList(dataList, list);
			// console.debug("New list after prepend", strigifyTrendDataList(dataList));

			return this;
		};

		/**
		 * 获取时间上最早的分时图数据
		 */
		this.getEarliestTrendData = function(){
			if(dataList.length > 0)
				return dataList[0];

			return null;
		};

		/**
		 * 获取时间上最早的分时图数据产生的时间的时间戳。单位：秒
		 * @returns {Integer} 时间上最早的分时图数据产生的时间的时间戳。单位：秒
		 */
		this.getEarliestTrendDataSeconds = function(){
			var earliestData = this.getEarliestTrendData();
			if(null == earliestData)
				return null;

			return earliestData.Date;
		};

		/**
		 * 从时间最晚的数据开始，截断超出指定尺寸的数据，从而只保留最新的N条数据
		 * @param {Integer} sizeToKeep 要保留的分时图数据个数
		 */
		this.truncateTrendDataFromLatest = function(sizeToKeep){
			/* 重置“可见数据的结束索引距离时间最晚的分时图数据的位移” */
			this.resetVisibleTrendDataListEndIndexOffsetFromLatest();

			var len = dataList.length;
			if(len <= sizeToKeep)
				return this;

			dataList = dataList.slice(len - sizeToKeep);
			return this;
		};

		/**
		 * 查询并更新分时图数据
		 * @returns {TrendChartData}
		 */
		this.queryAndUpdateLatestTrendData = function(){
			var self = this;

			getTrendChartData(symbol, null, function(resp){
				var list = resp.Data || [];

				var oldLatestData = dataList.length > 0? dataList[dataList.length - 1]: null;
				self.appendTrendDataList(list);

				var newLatestData = list.length > 0? list[list.length - 1]: null;
				if(JSON.stringify(oldLatestData) != newLatestData){
					latestTrendDataChangeListeners.forEach(function(listener){
						if(listener.trigggerOnlyWhenLatestTrendDataIsVisible && visibleListEndIndexOffsetFromLatest > 0)
							return;

						if(typeof listener == "function")
							try{listener();}catch(e){console.error(e, e.stack);}
					});
				}
			});
			return this;
		};

		/**
		 * 停止分时图数据的周期性更新（Http通道）
		 * @returns {TrendChartData}
		 */
		this.stopPeriodicallyUpdateByHttp = function(){
			clearInterval(refreshTimer);
			refreshTimer = null;

			return this;
		};

		/**
		 * 开始分时图数据的周期性更新（Http通道）
		 * @returns {TrendChartData}
		 */
		this.startPeriodicallyUpdateByHttp = function(){
			if(null != refreshTimer){
				return this;
			}

			var self = this;
			self.queryAndUpdateLatestTrendData();
			refreshTimer = setInterval(function(){
				self.queryAndUpdateLatestTrendData();
			}, refreshGap);

			return this;
		};

		/**
		 * 获取可见的分时图数据列表
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @returns {TrendData[]}
		 */
		this.getVisibleTrendDataList = function(count){
			if(arguments.length < 1)
				count = maxPageSize;

			var list = dataList;
			var len = list.length;
			visibleListEndIndexOffsetFromLatest = Math.max(visibleListEndIndexOffsetFromLatest, 0);
			visibleListEndIndexOffsetFromLatest = Math.min(visibleListEndIndexOffsetFromLatest, len);

			var arr = [];
			if(len == 0 || visibleListEndIndexOffsetFromLatest >= len)
				return arr;

			var endIndex = len - 1 - visibleListEndIndexOffsetFromLatest;/* min: 0, max: len - 1 */
			for(var i = endIndex, j = 0; i >= 0 && j < count; i--, j++)
				arr.unshift(list[i]);

			return arr;
		};

		/**
		 * 重置“可见数据的结束索引距离时间最晚的分时图数据的位移”为0
		 * @returns {TrendChartData}
		 */
		this.resetVisibleTrendDataListEndIndexOffsetFromLatest = function(){
			visibleListEndIndexOffsetFromLatest = 0;
			return this;
		};

		/**
		 * 更新“可见数据的结束索引距离时间最晚的分时图数据的位移”
		 * @param {Integer} offset 位移在既有基础上的偏移量
		 * @returns {TrendChartData}
		 */
		this.updateVisibleTrendDataListEndIndexOffsetFromLatest = function(offset){
			visibleListEndIndexOffsetFromLatest += offset;

			var len = dataList.length;
			visibleListEndIndexOffsetFromLatest = Math.max(visibleListEndIndexOffsetFromLatest, 0);
			visibleListEndIndexOffsetFromLatest = Math.min(visibleListEndIndexOffsetFromLatest, len);

			return this;
		};

		/**
		 * 设置“可见数据的结束索引距离时间最晚的分时图数据的位移”
		 * @param {Integer} offset 新的位移
		 * @returns {TrendChartData}
		 */
		this.setVisibleTrendDataListEndIndexOffsetFromLatest = function(offset){
			visibleListEndIndexOffsetFromLatest = offset;

			var len = dataList.length;
			visibleListEndIndexOffsetFromLatest = Math.max(visibleListEndIndexOffsetFromLatest, 0);
			visibleListEndIndexOffsetFromLatest = Math.min(visibleListEndIndexOffsetFromLatest, len);

			return this;
		};

		/**
		 * 根据当前的“可见数据的结束索引距离时间最晚的分时图数据的位移”，计算并返回“不可见的，时间比可见数据更早的分时图数据”的个数
		 * @param {Integer} [count=maxPageSize] 可见数据的数据尺寸
		 * @returns {Integer}
		 */
		this.getInvisibleEarlierTrendDataListLength = function(count){
			count = count || maxPageSize;

			var len = dataList.length;

			var visibleAreaEndIndex = len - 1 - visibleListEndIndexOffsetFromLatest;/* min: 0, max: len - 1 */
			var visibleAreaBeginIndex = visibleAreaEndIndex - (count - 1);
			if(visibleAreaBeginIndex <= 0)
				return 0;

			return visibleAreaBeginIndex;
		};

		/**
		 * 根据当前的“可见数据的结束索引距离时间最晚的分时图数据的位移”，计算并返回“不可见的，时间比可见数据更晚的分时图数据”的个数
		 * @returns {Integer}
		 */
		this.getInvisibleLaterTrendDataListLength = function(){
			return visibleListEndIndexOffsetFromLatest;
		};

		/**
		 * 状态重置
		 * @param {Integer} [sizeToKeep=maxPageSize] 要保留的最新的分时图数据的尺寸
		 * @returns {TrendChartData}
		 */
		this.reset = function(sizeToKeep){
			if(arguments.length < 1)
				sizeToKeep = maxPageSize;

			if(sizeToKeep > 0)
				this.truncateTrendDataFromLatest(sizeToKeep);
			else
				dataList = [];
			this.resetVisibleTrendDataListEndIndexOffsetFromLatest();

			return this;
		};
	};

	/**
	 * @constructor
	 * 分时图数据管理器，用于实现分时图数据的加载等
	 * @param {String} symbol 产品代码
	 */
	var TrendChartDataManager = function(symbol){
		Object.defineProperty(this, "symbol", {value: symbol, configurable: false, writable: false});

		var trendChartData = new TrendChartData(symbol);

		/** 是否正在加载分时图数据（互斥锁，用于保证同一时刻只有一个加载请求在执行） */
		var isLoadingTrendData = false;

		/** 是否所有历史数据均已加载完成 */
		var isAllEarlierTrendDataLoaded = false;

		var self = this;

		/**
		 * 获取关联的分时图数据实例
		 * @returns {TrendChartData}
		 */
		this.getTrendChartData = function(){
			return trendChartData;
		};

		/**
		 * 加载更早的分时图数据
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @param {JsonObject} [ops] 控制选项
		 * @param {Function} [ops.callback] 获取到分时图数据后执行的方法
		 * @param {Function} [ops.action4NoMoreEarlierData] 可用数据不足，且历史数据加载完毕（没有更多历史数据）时执行的方法
		 * @returns {TrendChartDataManager}
		 */
		var loadEarlierTrendData = function(count, ops){
			count = count || maxPageSize;
			ops = util.setDftValue(ops, {
				callback: null,
				action4NoMoreEarlierData: null,
			});

			var loadedList = [];
			var execCallback = function(){
				trendChartData.prependTrendDataList(loadedList);
				var list = loadedList.slice(Math.max(loadedList.length - count, 0));

				if(typeof ops.callback == "function")
					ops.callback(list);
			};

			/**
			 * 执行分时图数据加载。
			 * 因为服务端限定了单次返回的最大数据量，所以客户端需要不断加载，直至累计的数据量满足业务调用方所需的数据量为止
			 */
			var doLoad = function(){
				var loadedListEarliestSeconds = 0 == loadedList.length? null: loadedList[0].Date;
				var trendChartDataEarliestSeconds = trendChartData.getEarliestTrendDataSeconds();
				var endTime = loadedListEarliestSeconds || trendChartDataEarliestSeconds || 0;

				getTrendChartData(symbol, endTime, function(resp){
					var list = resp.Data || [];
					var obtainedListLen = list.length;

					list = filterDuplicateTrendData(loadedList, list);
					loadedList = list.concat(loadedList);

					if(loadedList.length >= count){/* 数据量满足 */
						execCallback();
					}else{/* 数据量不足，需继续加载 */
						if(obtainedListLen == 0){/* 不会有更多历史数据 */
							isAllEarlierTrendDataLoaded = true;
							execCallback();
							if(typeof ops.action4NoMoreEarlierData == "function")
								ops.action4NoMoreEarlierData();
						}else/* 继续加载 */
							doLoad();
					}
				}, function(){
					execCallback();
				});
			};
			doLoad();

			return self;
		};

		/**
		 * 获取可见的分时图数据列表。特性：
		 * 1. 优先使用本地数据执行回调方法（ops.callback），如果本地数据不足，则尝试加载历史数据，并在有更多历史数据时，再次执行回调方法
		 * 2. 如果本地数据的个数C不满足：C >= 1.5 * CV，则自动加载历史数据。其中CV为业务调用方索取的数据个数
		 *
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @param {JsonObject} [ops] 控制选项
		 * @param {Function} [ops.callback] 获取到分时图数据后执行的回调方法
		 * @param {Function} [ops.action4NoMoreEarlierData] 可用数据不足，且历史数据加载完毕（没有更多历史数据）时执行的方法
		 * @returns {TrendChartDataManager}
		 */
		this.getVisibleTrendDataList = function(count, ops){
			count = count || maxPageSize;
			ops = util.setDftValue(ops, {
				callback: null,
				action4NoMoreEarlierData: null,
			});

			var list = trendChartData.getVisibleTrendDataList(count);
			var invisibleEarlierTrendDataListLength = trendChartData.getInvisibleEarlierTrendDataListLength(count);

			var isLocalDataSufficient = list.length >= count;
			var ifNeedToLoadEarlierData = !isLocalDataSufficient || (invisibleEarlierTrendDataListLength < count / 2);

			var self = this;
			var len = list.length;
			var callbackTriggered = false;
			if(0 != len){
				if(typeof ops.callback == "function"){
					console.log("Exec callback for the first time", strigifyTrendDataList(list));

					ops.callback(list);
					callbackTriggered = true;
				}
			}else
				console.debug("No local data exist to exec callback");

			if(ifNeedToLoadEarlierData && !isLoadingTrendData && !isAllEarlierTrendDataLoaded){
				console.debug("Loading earlier data.", list.length, count);

				isLoadingTrendData = true;
				loadEarlierTrendData(count, {
					callback: function(list){
						isLoadingTrendData = false;

						if(isLocalDataSufficient){
							return;
						}

						console.log("Trying to get new trend data list of count: " + count, strigifyTrendDataList(trendChartData.getTrendDataList()));
						var newList = trendChartData.getVisibleTrendDataList(count);
						if(!callbackTriggered || newList.length != len){
							if(typeof ops.callback == "function"){
								console.log("Exec callback for the second time", strigifyTrendDataList(newList));
								ops.callback(newList);
							}
						}
					},
					action4NoMoreEarlierData: ops.action4NoMoreEarlierData
				});
			}

			return this;
		};

		/**
		 * 更新“可见数据的结束索引距离时间最晚的分时图数据的位移”。如果偏移量为正，且没有更多历史数据，则忽略本次操作
		 * @param {Integer} visibleTrendDataCount 可见数据量
		 * @param {Integer} offset 位移在既有基础上的偏移量
		 * @returns {TrendChartData}
		 */
		this.updateVisibleTrendDataListEndIndexOffsetFromLatest = function(visibleTrendDataCount, offset){
			var currentOffset = trendChartData.getInvisibleLaterTrendDataListLength();
			var newOffset = currentOffset + offset;
			var maxOffset = Math.max(trendChartData.getTrendDataList().length - visibleTrendDataCount, 0);
			if(isAllEarlierTrendDataLoaded && newOffset > maxOffset){
				newOffset = maxOffset;
				trendChartData.setVisibleTrendDataListEndIndexOffsetFromLatest(newOffset);
			}else
				trendChartData.updateVisibleTrendDataListEndIndexOffsetFromLatest(offset);

			return this;
		};

		/**
		 * 状态重置
		 * @param {Integer} [sizeToKeep=maxPageSize] 要保留的最新的分时图数据的尺寸
		 * @returns {TrendChartDataManager}
		 */
		this.reset = function(sizeToKeep){
			isLoadingTrendData = false;
			isAllEarlierTrendDataLoaded = false;
			trendChartData.reset(sizeToKeep);

			return this;
		};
	};

	/**
	 * 获取指定产品代码对应的实例。如果实例不存在，则自动创建一个
	 * @param {String} symbol 产品代码
	 */
	TrendChartDataManager.ofSymbol = (function(){
		/**
		 * 所有已经创建的实例
		 * @type {Object.<String, TrendChartDataManager>}
		 */
		var managerInstances = {};

		return function(symbol){
			var instance = managerInstances[symbol];
			if(null == instance){
				instance = new TrendChartDataManager(symbol);
				managerInstances[symbol] = instance;
			}

			return instance;
		};
	})();

	namespace.TrendChartDataManager = TrendChartDataManager;
})(window);