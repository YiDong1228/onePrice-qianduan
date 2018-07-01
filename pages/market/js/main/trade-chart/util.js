;(function(namespace){
	var setDftValue = function(ops, dftOps){
		ops = ops || {};
		dftOps = dftOps || {};

		/* 参数不存在时，从默认参数中读取并赋值 */
		for(var p in dftOps)
			if(!(p in ops))
				ops[p] = dftOps[p];

		return ops;
	};

	/* 查找元素 */
	var find = function(selector){
		return document.querySelector(selector);
	};
	var findAll = function(selector){
		return document.querySelectorAll(selector);
	};

	/**
	 * 克隆对象
	 * @param obj {Object} 要克隆的对象
	 * @param keepType {Boolean} 是否保持对象类型。默认为：true
	 */
	var cloneObject = function(obj, keepType){
		if(null === obj)
			return null;
		if(undefined === obj)
			return undefined;

		if(arguments.length < 2)
			keepType = true;

		var newObj = {};
		for(var p in obj){
			var v = obj[p];

			if((typeof v == "object") && !keepType){
				newObj[p] = cloneObject(v, true);
			}else
				newObj[p] = v;
		}

		return newObj;
	};

	/**
	 * 尝试调用指定的方法
	 * @param {Function} func 待执行的方法
	 * @param {Object} ctx 方法执行时的this上下文
	 * @param {Any} args... 方法参数列表
	 */
	var try2Call = function(func, ctx, args){
		if(null == func || typeof func != "function")
			return;

		try{
			var tmp = "", index = 2;
			for(var i = index; i < arguments.length; i++)
				tmp += ",arguments[" + i + "]";

			eval("func.call(ctx" + tmp + ")");
		}catch(e){console.error("Error occured while executing function: " + func.name, e, e.stack);}
	};

	/**
	 * 尝试调用指定的方法
	 * @param {Function} func 待执行的方法
	 * @param {Object} ctx 方法执行时的this上下文
	 * @param {Arguments} args 方法参数列表对象
	 */
	var try2Apply = function(func, ctx, args){
		if(null == func || typeof func != "function")
			return;

		try{func.apply(ctx, args);}catch(e){console.error("Error occured while executing function: " + func.name, e, e.stack);}
	};

	/**
	 * 判断给定的字符串是否是空字符串
	 * @param {String} str 要判断的字符串
	 * @param {Boolean} [trim=false] 是否在判断前执行前后空白符号的裁剪操作
	 */
	var isEmptyString = function(str, trim){
		if(arguments.length < 2)
			trim = false;

		if(null === str || undefined === str)
			return true;

		str = String(str);
		if(trim)
			str = str.trim();

		return str.length == 0;
	};

	namespace.util = {
		setDftValue: setDftValue,
		find: find,
		findAll: findAll,
		cloneObject: cloneObject,
		try2Call: try2Call,
		try2Apply: try2Apply,
		isEmptyString: isEmptyString
	};
})(window);