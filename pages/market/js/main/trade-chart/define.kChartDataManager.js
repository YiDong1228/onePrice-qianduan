;(function(namespace){
	var util = namespace.util;


	/**
	 * 刷新K线图数据时，相邻两次刷新操作之间的时间间隔。单位：毫秒
	 * @type {Number}
	 */
	var refreshGap = 2000;

	var maxPageSize = 300;


	/**
	 * @typedef {Object} KData
	 */

	/**
	 * 获取K线图数据
	 * @param {String} symbol 产品代码
	 * @param {Function} onsuccess 获取成功后执行的方法
	 * @param {Function} onerror 获取失败时执行的方法
	 */
	var getKChartData = function(symbol, type, count, date, onsuccess, onerror){
		var url = "http://dt.jctytech.com/stock.php?u=17305&sign=86469c04bda0a04b9f26a2b458134cb4&stamp=1525435040897&type=kline&symbol=" + symbol;
		if(null != date && (date = String(date).trim()) != "")
			url += "&et=" + date;
		if(null != type && (type = String(type).trim()) != "")
			url += "&line=" + type;
		if(null != count && (count = String(count).trim()) != "")
			url += "&num=" + count;

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
				console.error("Invalid response while retrieving k chart data");
				return;
			}

			resp = resp || [];
			resp = resp.reverse();
			onsuccess && onsuccess(resp);
		};
		xhr.send();
	};

	/**
	 * 以既有的K线图数据为基准，过滤给定的K线图数据列表，使其移除重复的数据
	 * @param {KData[]} baseList 既有的K线图数据
	 * @param {KData[]} list 待过滤重复数据的K线图数据列表
	 */
	var filterDuplicateKData = function(baseList, list){
		if(!Array.isArray(baseList) || !Array.isArray(list))
			return list;

		return list.filter(function(d){
			return !baseList.some(function(k){
				return k.Date == d.Date;
			});
		});
	};

	/**
	 * 将给定的K线图数据融合至目标列表中。如果不存在，则按顺序插入，否则覆盖既有取值
	 * @param {KData[]} targetList 目标列表
	 * @param {KData[]} list 待融合的列表
	 * @returns {KData[]}
	 */
	var mergeKDataList = function(targetList, list){
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

	/**
	 * 扫描给定的K线图数据，并计算涨跌量、涨跌幅、MA指标等，并将其附加至原始数据上
	 * @param {KData[]} kLineDataList K线图数据数组
	 */
	var scanAndEnrichKLineData = function(kLineDataList){
		for(var i = 0; i < kLineDataList.length; i++){
			var itm = kLineDataList[i];

			// var previousClosePrice = kLineDataList[i - 1].closePrice;

			/* 计算涨跌量和涨跌幅 */
			if(null == itm.closePriceChangeAmount || null == itm.closePriceChangeRate){
				var tmp = +itm.Open;
				itm.closePriceChangeAmount = +itm.Close - tmp;
				itm.closePriceChangeRate = itm.closePriceChangeAmount / (tmp || 1);
			}

			/** K线图支持的MA指标，如MA5、MA10等 */
			var maIndices = [5, 10, 20, 30];

			/* 计算MA */
			maIndices.forEach(function(num){
				var key = "ma" + num;

				if(i < num - 1){
					delete itm[key];
					return;
				}

				if(key in itm)
					return;

				var sum = 0;
				for(var j = i; j > i - num; j--)
					sum += Number(kLineDataList[j].Close);
				itm[key] = sum / num;
			});
		}

		return kLineDataList;
	};

	var strigifyKDataList = function(list){
		return list.map(function(t){
			return t.Date;
		});
	};

	/**
	 * K线图数据容器
	 * @param {String} symbol 产品代码
	 * @param {String} kType K线类型
	 * @constructor
	 */
	var KChartData = function(symbol, kType){
		Object.defineProperty(this, "symbol", {value: symbol, configurable: false, writable: false});
		Object.defineProperty(this, "kType", {value: kType, configurable: false, writable: false});

		/* K线图数据 */
		var dataList = [];

		/**
		 * 可见数据的结束索引距离时间最晚的K线图数据的位移
		 * @type {number}
		 */
		var visibleListEndIndexOffsetFromLatest = 0;

		/**
		 * 最新的K线图数据发生变化时执行的方法
		 * @type {Function[]}
		 */
		var latestKDataChangeListeners = [];

		/**
		 * 最新的K线图数据刷新定时器
		 */
		var refreshTimer = null;


		/**
		 * 获取K线图数据列表（自动消除重复数据）
		 * @returns {KData[]}
		 */
		this.getKDataList = function(){
			return dataList;
		};

		/**
		 * 添加监听器：“最新的K线图数据发生变化”
		 * @param {Function} listener 要添加的监听器
		 * @param {Boolean} [trigggerOnlyWhenLatestKDataIsVisible=false] 是否仅当最新K线图数据可见时才出发
		 * @returns {KChartData}
		 */
		this.addLatestKDataChangeListener = function(listener, trigggerOnlyWhenLatestKDataIsVisible){
			if(latestKDataChangeListeners.indexOf(listener) != -1)
				return this;

			if(arguments.lenth < 2)
				trigggerOnlyWhenLatestKDataIsVisible = false;

			listener.trigggerOnlyWhenLatestKDataIsVisible = trigggerOnlyWhenLatestKDataIsVisible;/* 暂存标记，供调用使用 */
			latestKDataChangeListeners.push(listener);
			return this;
		};

		/**
		 * 移除监听器：“最新的K线图数据发生变化”
		 * @param {Function} listener 要移除的监听器
		 * @returns {KChartData}
		 */
		this.removeLatestKDataChangeListener = function(listener){
			var index = latestKDataChangeListeners.indexOf(listener);
			if(index == -1)
				return this;

			latestKDataChangeListeners.splice(index, 1);
			return this;
		};

		/**
		 * 在既有数据列表的末尾追加给定的K线图数据
		 * @param {KData[]} list 要在末尾处追加的K线图数据
		 * @returns {KChartData}
		 */
		this.appendKDataList = function(list){
			if(!Array.isArray(list))
				return this;

			var oldLen = dataList.length;
			dataList = mergeKDataList(dataList, list);
			scanAndEnrichKLineData(dataList);

			var newLen = dataList.length;
			var lenDelta = newLen - oldLen;

			/* 保持可见数据的一致性。等于0时，表示没有位移，需要继续保持为“没有位移” */
			if(visibleListEndIndexOffsetFromLatest > 0)
				visibleListEndIndexOffsetFromLatest += lenDelta;

			return this;
		};

		/**
		 * 在既有数据列表的开始位置追加给定的K线图数据
		 * @param {KData[]} list 要在开始位置追加的K线图数据
		 * @returns {KChartData}
		 */
		this.prependKDataList = function(list){
			if(!Array.isArray(list))
				return this;

			dataList = mergeKDataList(dataList, list);
			scanAndEnrichKLineData(dataList);

			return this;
		};

		/**
		 * 获取时间上最早的K线图数据
		 */
		this.getEarliestKData = function(){
			if(dataList.length > 0)
				return dataList[0];

			return null;
		};

		/**
		 * 获取时间上最早的K线图数据产生的时间的时间戳。单位：秒
		 * @returns {Integer} 时间上最早的K线图数据产生的时间的时间戳。单位：秒
		 */
		this.getEarliestKDataSeconds = function(){
			var earliestData = this.getEarliestKData();
			if(null == earliestData)
				return null;

			return earliestData.Date;
		};

		/**
		 * 从时间最晚的数据开始，截断超出指定尺寸的数据，从而只保留最新的N条数据
		 * @param {Integer} sizeToKeep 要保留的K线图数据个数
		 */
		this.truncateKDataFromLatest = function(sizeToKeep){
			/* 重置“可见数据的结束索引距离时间最晚的K线图数据的位移” */
			this.resetVisibleKDataListEndIndexOffsetFromLatest();

			var len = dataList.length;
			if(len <= sizeToKeep)
				return this;

			dataList = dataList.slice(len - sizeToKeep);
			return this;
		};

		/**
		 * 查询并更新K线图数据
		 * @returns {KChartData}
		 */
		this.queryAndUpdateLatestKData = function(){
			var self = this;

			getKChartData(symbol, kType, 20, null, function(resp){
				var list = resp || [];

				var oldLatestData = dataList.length > 0? dataList[dataList.length - 1]: null;
				self.appendKDataList(list);

				var newLatestData = list.length > 0? list[list.length - 1]: null;
				if(JSON.stringify(oldLatestData) != newLatestData){
					latestKDataChangeListeners.forEach(function(listener){
						if(listener.trigggerOnlyWhenLatestKDataIsVisible && visibleListEndIndexOffsetFromLatest > 0)
							return;

						if(typeof listener == "function")
							try{listener();}catch(e){console.error(e, e.stack);}
					});
				}
			});
			return this;
		};

		/**
		 * 停止K线图数据的周期性更新（Http通道）
		 * @returns {KChartData}
		 */
		this.stopPeriodicallyUpdateByHttp = function(){
			clearInterval(refreshTimer);
			refreshTimer = null;

			return this;
		};

		/**
		 * 开始K线图数据的周期性更新（Http通道）
		 * @returns {KChartData}
		 */
		this.startPeriodicallyUpdateByHttp = function(){
			if(null != refreshTimer){
				return this;
			}

			var self = this;
			self.queryAndUpdateLatestKData();
			refreshTimer = setInterval(function(){
				self.queryAndUpdateLatestKData();
			}, refreshGap);

			return this;
		};

		/**
		 * 获取可见的K线图数据列表
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @returns {KData[]}
		 */
		this.getVisibleKDataList = function(count){
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
		 * 重置“可见数据的结束索引距离时间最晚的K线图数据的位移”为0
		 * @returns {KChartData}
		 */
		this.resetVisibleKDataListEndIndexOffsetFromLatest = function(){
			visibleListEndIndexOffsetFromLatest = 0;
			return this;
		};

		/**
		 * 更新“可见数据的结束索引距离时间最晚的K线图数据的位移”
		 * @param {Integer} offset 位移在既有基础上的偏移量
		 * @returns {KChartData}
		 */
		this.updateVisibleKDataListEndIndexOffsetFromLatest = function(offset){
			visibleListEndIndexOffsetFromLatest += offset;

			var len = dataList.length;
			visibleListEndIndexOffsetFromLatest = Math.max(visibleListEndIndexOffsetFromLatest, 0);
			visibleListEndIndexOffsetFromLatest = Math.min(visibleListEndIndexOffsetFromLatest, len);

			return this;
		};

		/**
		 * 设置“可见数据的结束索引距离时间最晚的K线图数据的位移”
		 * @param {Integer} offset 新的位移
		 * @returns {KChartData}
		 */
		this.setVisibleKDataListEndIndexOffsetFromLatest = function(offset){
			visibleListEndIndexOffsetFromLatest = offset;

			var len = dataList.length;
			visibleListEndIndexOffsetFromLatest = Math.max(visibleListEndIndexOffsetFromLatest, 0);
			visibleListEndIndexOffsetFromLatest = Math.min(visibleListEndIndexOffsetFromLatest, len);

			return this;
		};

		/**
		 * 根据当前的“可见数据的结束索引距离时间最晚的K线图数据的位移”，计算并返回“不可见的，时间比可见数据更早的K线图数据”的个数
		 * @param {Integer} [count=maxPageSize] 可见数据的数据尺寸
		 * @returns {Integer}
		 */
		this.getInvisibleEarlierKDataListLength = function(count){
			count = count || maxPageSize;

			var len = dataList.length;

			var visibleAreaEndIndex = len - 1 - visibleListEndIndexOffsetFromLatest;/* min: 0, max: len - 1 */
			var visibleAreaBeginIndex = visibleAreaEndIndex - (count - 1);
			if(visibleAreaBeginIndex <= 0)
				return 0;

			return visibleAreaBeginIndex;
		};

		/**
		 * 根据当前的“可见数据的结束索引距离时间最晚的K线图数据的位移”，计算并返回“不可见的，时间比可见数据更晚的K线图数据”的个数
		 * @returns {Integer}
		 */
		this.getInvisibleLaterKDataListLength = function(){
			return visibleListEndIndexOffsetFromLatest;
		};

		/**
		 * 状态重置
		 * @param {Integer} [sizeToKeep=maxPageSize] 要保留的最新的K线图数据的尺寸
		 * @returns {KChartData}
		 */
		this.reset = function(sizeToKeep){
			if(arguments.length < 1)
				sizeToKeep = maxPageSize;

			if(sizeToKeep > 0)
				this.truncateKDataFromLatest(sizeToKeep);
			else
				dataList = [];
			this.resetVisibleKDataListEndIndexOffsetFromLatest();

			return this;
		};
	};

	/**
	 * @constructor
	 * K线图数据管理器，用于实现K线图数据的加载等
	 * @param {String} symbol 产品代码
	 * @param {String} kType K线类型
	 */
	var KChartDataManager = function(symbol, kType){
		Object.defineProperty(this, "symbol", {value: symbol, configurable: false, writable: false});
		Object.defineProperty(this, "kType", {value: kType, configurable: false, writable: false});

		var kChartData = new KChartData(symbol, kType);

		/** 是否正在加载K线图数据（互斥锁，用于保证同一时刻只有一个加载请求在执行） */
		var isLoadingKData = false;

		/** 是否所有历史数据均已加载完成 */
		var isAllEarlierKDataLoaded = false;

		var self = this;

		/**
		 * 获取关联的K线图数据实例
		 * @returns {KChartData}
		 */
		this.getKChartData = function(){
			return kChartData;
		};

		/**
		 * 加载更早的K线图数据
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @param {JsonObject} [ops] 控制选项
		 * @param {Function} [ops.callback] 获取到K线图数据后执行的方法
		 * @param {Function} [ops.action4NoMoreEarlierData] 可用数据不足，且历史数据加载完毕（没有更多历史数据）时执行的方法
		 * @returns {KChartDataManager}
		 */
		var loadEarlierKData = function(count, ops){
			count = count || maxPageSize;
			ops = util.setDftValue(ops, {
				callback: null,
				action4NoMoreEarlierData: null,
			});

			var loadedList = [];
			var execCallback = function(){
				kChartData.prependKDataList(loadedList);
				var list = loadedList.slice(Math.max(loadedList.length - count, 0));

				if(typeof ops.callback == "function")
					ops.callback(list);
			};

			/**
			 * 执行K线图数据加载。
			 * 因为服务端限定了单次返回的最大数据量，所以客户端需要不断加载，直至累计的数据量满足业务调用方所需的数据量为止
			 */
			var doLoad = function(){
				var loadedListEarliestSeconds = 0 == loadedList.length? null: loadedList[0].Date;
				var kChartDataEarliestSeconds = kChartData.getEarliestKDataSeconds();
				var endTime = loadedListEarliestSeconds || kChartDataEarliestSeconds || 0;

				getKChartData(symbol, kType, count, endTime, function(resp){
					var list = resp || [];
					var obtainedListLen = list.length;

					list = filterDuplicateKData(loadedList, list);
					loadedList = list.concat(loadedList);

					if(loadedList.length >= count){/* 数据量满足 */
						execCallback();
					}else{/* 数据量不足，需继续加载 */
						if(obtainedListLen < count){/* 不会有更多历史数据 */
							isAllEarlierKDataLoaded = true;
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
		 * 获取可见的K线图数据列表。特性：
		 * 1. 优先使用本地数据执行回调方法（ops.callback），如果本地数据不足，则尝试加载历史数据，并在有更多历史数据时，再次执行回调方法
		 * 2. 如果本地数据的个数C不满足：C >= 1.5 * CV，则自动加载历史数据。其中CV为业务调用方索取的数据个数
		 *
		 * @param {Integer} [count=maxPageSize] 要获取的数据尺寸
		 * @param {JsonObject} [ops] 控制选项
		 * @param {Function} [ops.callback] 获取到K线图数据后执行的回调方法
		 * @param {Function} [ops.action4NoMoreEarlierData] 可用数据不足，且历史数据加载完毕（没有更多历史数据）时执行的方法
		 * @returns {KChartDataManager}
		 */
		this.getVisibleKDataList = function(count, ops){
			count = count || maxPageSize;
			ops = util.setDftValue(ops, {
				callback: null,
				action4NoMoreEarlierData: null,
			});

			var list = kChartData.getVisibleKDataList(count);
			var invisibleEarlierKDataListLength = kChartData.getInvisibleEarlierKDataListLength(count);

			var isLocalDataSufficient = list.length >= count;
			var ifNeedToLoadEarlierData = !isLocalDataSufficient || (invisibleEarlierKDataListLength < count / 2);

			var self = this;
			var len = list.length;
			var callbackTriggered = false;
			if(0 != len){
				if(typeof ops.callback == "function"){
					console.log("Exec callback for the first time", strigifyKDataList(list));

					ops.callback(list);
					callbackTriggered = true;
				}
			}else
				console.debug("No local data exist to exec callback");

			if(ifNeedToLoadEarlierData && !isLoadingKData && !isAllEarlierKDataLoaded){
				console.debug("Loading earlier data.", list.length, count);

				isLoadingKData = true;
				loadEarlierKData(count, {
					callback: function(list){
						isLoadingKData = false;

						if(isLocalDataSufficient){
							return;
						}

						console.log("Trying to get new k data list of count: " + count, strigifyKDataList(kChartData.getKDataList()));
						var newList = kChartData.getVisibleKDataList(count);
						if(!callbackTriggered || newList.length != len){
							if(typeof ops.callback == "function"){
								console.log("Exec callback for the second time", strigifyKDataList(newList));
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
		 * 更新“可见数据的结束索引距离时间最晚的K线图数据的位移”。如果偏移量为正，且没有更多历史数据，则忽略本次操作
		 * @param {Integer} visibleKDataCount 可见数据量
		 * @param {Integer} offset 位移在既有基础上的偏移量
		 * @returns {KChartData}
		 */
		this.updateVisibleKDataListEndIndexOffsetFromLatest = function(visibleKDataCount, offset){
			var currentOffset = kChartData.getInvisibleLaterKDataListLength();
			var newOffset = currentOffset + offset;
			var maxOffset = Math.max(kChartData.getKDataList().length - visibleKDataCount, 0);
			if(isAllEarlierKDataLoaded && newOffset > maxOffset){
				newOffset = maxOffset;
				kChartData.setVisibleKDataListEndIndexOffsetFromLatest(newOffset);
			}else
				kChartData.updateVisibleKDataListEndIndexOffsetFromLatest(offset);

			return this;
		};

		/**
		 * 状态重置
		 * @param {Integer} [sizeToKeep=maxPageSize] 要保留的最新的K线图数据的尺寸
		 * @returns {KChartDataManager}
		 */
		this.reset = function(sizeToKeep){
			isLoadingKData = false;
			isAllEarlierKDataLoaded = false;
			kChartData.reset(sizeToKeep);

			return this;
		};
	};

	/**
	 * 获取指定产品代码对应的实例。如果实例不存在，则自动创建一个
	 * @param {String} symbol 产品代码
	 * @param {String} kType K线类型
	 */
	KChartDataManager.ofSymbolAndType = (function(){
		/**
		 * 所有已经创建的实例
		 * @type {Object.<String, KChartDataManager>}
		 */
		var managerInstances = {};

		return function(symbol, kType){
			var k = symbol + "_" + kType;

			var instance = managerInstances[k];
			if(null == instance){
				instance = new KChartDataManager(symbol, kType);
				managerInstances[k] = instance;
			}

			return instance;
		};
	})();

	namespace.KChartDataManager = KChartDataManager;
})(window);