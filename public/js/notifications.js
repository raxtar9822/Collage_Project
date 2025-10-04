(function(){
	function ensureStack(){
		var stack=document.getElementById('notif-stack');
		if(!stack){
			stack=document.createElement('div');
			stack.id='notif-stack';
			stack.className='notif-stack';
			document.body.appendChild(stack);
		}
		return stack;
	}

	function capitalizeWords(str){
		return (str||'').split(/[_\s]+/).map(function(w){return w? w.charAt(0).toUpperCase()+w.slice(1):'';}).join(' ');
	}

	function showToast(opts){
		var stack=ensureStack();
		var el=document.createElement('div');
		el.className='notif';
		var avatar=document.createElement('div');
		avatar.className='avatar';
		avatar.textContent='✓';
		var content=document.createElement('div');
		content.className='content';
		var title=document.createElement('div');
		title.className='title';
		title.textContent=opts.title||'Update';
		var body=document.createElement('div');
		body.className='body';
		body.textContent=opts.body||'';
		var meta=document.createElement('div');
		meta.className='meta';
		meta.textContent=new Date().toLocaleTimeString();
		content.appendChild(title);
		content.appendChild(body);
		content.appendChild(meta);
		el.appendChild(avatar);
		el.appendChild(content);
		stack.appendChild(el);
		var timeout=setTimeout(function(){ removeToast(); }, 5000);
		function removeToast(){ if(el.parentNode){ el.parentNode.removeChild(el);} }
		el.addEventListener('click', function(){ clearTimeout(timeout); removeToast(); });
	}

	var socket=window.socket || (typeof io!=='undefined'? io(): null);
	if(!socket && typeof io!=='undefined'){
		socket=io();
	}
	if(socket){
		window.socket=socket;
		socket.on('orders:updated', function(payload){
			try{
				var type=payload && payload.type;
				var order=payload && payload.order;
				var orderId=payload && payload.orderId;
				var status=payload && payload.status;
				if(type==='created'){
					showToast({
						title:'New order',
						body:'#'+orderId+(order&&order.patient_name? ' for '+order.patient_name:'')+(order&&order.item_name? ': '+order.item_name:'')
					});
				}else if(type==='status'){
					showToast({
						title:'Order updated',
						body:'#'+orderId+' is now '+capitalizeWords(status)+(order&&order.patient_name&&order.item_name? ' • '+order.patient_name+' – '+order.item_name:'')
					});
				}else if(type==='menu_reloaded'){
					showToast({ title:'Menu updated', body:'The menu has been refreshed' });
				}
			}catch(e){ /* no-op */ }
		});
	}
})();


