var base_url = "";
var xAnimationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

var currentBoatdaysNum = 0;

var queryLimit = 9;

var getTemplate = function(name) {
	return $('script[type="x-boatday/template"][name="'+name+'"]').html();
};

function dl(id) {

	var href = "https://www.boatdayapp.com/dl/boatday/"+id;
	if( /Android/i.test(navigator.userAgent) ){
		href = "android-app://com.boat.day/boatday/boatday?id="+id;
	} else if( /iPhone|iPad|iPod/i.test(navigator.userAgent) ){
		href = "boatday://boatday?id="+id;	
	}
	window.open(href, "_blank");	
}

function fbShare(id){
	FB.ui({
		method: 'share',
		href: 'https://www.boatdayapp.com/dl/boatday/'+id,
	}, function(response){
		console.log(response);
	});
}

function scrollToAnchor(aid) {
	var aTag = $(aid);
	$('html, body').animate({ scrollTop: aTag.offset().top - 88}, 'slow');
}

function departureTimeToDisplayTime(time) {
	var h = parseInt(time);
	var mm = (time-h) * 60;
	var dd = 'AM';
	if( h >= 12 ) {
		dd = 'PM';
		h -= 12;
	}
	return (h==0?12:h)+':'+(mm==0?'00':+(mm < 10 ? '0'+mm : mm))+' '+dd;
}

function getShortenDayname(date){
	var daysName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
	return daysName[date.getDay()];
}

function getDateToEn(date){
	var d = getShortenDayname(date); 
	return (d + ", " + (date.getMonth() + 1) + "/" + date.getDate());
}

function getCityFromLocation(location) {

	var l = location.split(",");

	if( l.length == 0 ) {
		return '';
	}

	if( l.length == 1 ) {
		return l[0].trim();
	}

	if( l.length > 1 ) {
		return l[l.length - 2].trim(); //trim($l[count($l) - 2]);
	}
}

function getGuestRate(type) {
	return type == 'business' ? 0.05 : 0.1;
}

function getGuestPrice(price, guestPart) {
	return Math.ceil(price / (1 - guestPart));
}

function disableFormFields(){
	$('input[name="date-from"]').prop('disabled', true);
	$('input[name="date-to"]').prop('disabled', true);
	$('select[name="category"]').prop('disabled', true);
	$('#slider-price').slider('disable');
	//$('#slider-departure').slider('disable');
	$('select[name="location"]').prop('disabled', true);
}

function enableFormFields(){
	$('input[name="date-from"]').prop('disabled', false);
	$('input[name="date-to"]').prop('disabled', false);
	$('select[name="category"]').prop('disabled', false);
	$('#slider-price').slider('enable');
	//$('#slider-departure').slider('enable');
	$('select[name="location"]').prop('disabled', false);
}

function loadBoatDays() {

	currentBoatdaysNum = 0;

	disableFormFields();

	$('.upcoming-boatdays .show-more').hide();

	var tpl = _.template(getTemplate('boatday-card'));
	var emptyTpl = _.template(getTemplate('boatday-empty'));

    var fromDate = $('input[name="date-from"]').datepicker('getDate');
   	var toDate = $('input[name="date-to"]').datepicker('getDate');
   	var category = $('select[name="category"]').val();
   	var priceArray = $('#slider-price').slider('getValue');
	//var timeArray = $('#slider-departure').slider('getValue');
	var location = $('select[name="location"]').val();

	var target = $('.upcoming-boatdays .container .row');
	target.html("");

	var query = new Parse.Query(Parse.Object.extend('BoatDay'));
	query.include('captain');
	query.include('host');
	query.limit(queryLimit);
	
	query.equalTo('status', 'complete');
	query.greaterThanOrEqualTo('price', parseInt(priceArray[0]));
	query.lessThanOrEqualTo('price', parseInt(priceArray[1]));
	//query.greaterThanOrEqualTo('departureTime', parseFloat(timeArray[0]));
	//query.lessThanOrEqualTo('departureTime', parseFloat(timeArray[1]));
	query.ascending("date");

	var around = new Parse.GeoPoint({
		latitude: parseFloat($('select[name="location"]').find(':selected').attr('lat')),
		longitude: parseFloat($('select[name="location"]').find(':selected').attr('lng'))
	});


	if(category != "all"){
		query.equalTo('category', category);
	}

	if( fromDate != null ) {
		query.greaterThanOrEqualTo("date",fromDate);
	} else {
		query.greaterThanOrEqualTo("date", new Date());
	}

	if( toDate != null ) {
		query.lessThanOrEqualTo("date", toDate);
	}

	Parse.Config.get().then(function(config){

		if(location != "everywhere"){
			query.withinMiles("location", around, config.get('FILTER_AROUND_RADIUS'));
		}
	
		query.find().then(function(boatdays) {

			currentBoatdaysNum = boatdays.length + currentBoatdaysNum;

			if(boatdays.length > 0){
				_.each(boatdays, function(boatday){
					target.append(tpl({
						boatday: boatday,
						departureTime: departureTimeToDisplayTime(boatday.get("departureTime")),
						dateToEn: getDateToEn(new Date(boatday.get('date'))),
						location: getCityFromLocation(boatday.get('locationText'))
					}));
					var q = boatday.relation('boatdayPictures').query();
					q.ascending('order');
					q.first().then(function(fileholder) {
						if( fileholder ) {
							$('.bd-'+boatday.id+' .image').css({ backgroundImage: 'url('+fileholder.get('file').url()+')' });
						}
					});
				});

				if(currentBoatdaysNum <= boatdays.length){
					$('.upcoming-boatdays .show-more').show();
				}

			} else {
				target.append(emptyTpl);
			}

		}, function(error){
			console.log(error);
		});

		enableFormFields();
	});
	
}

function loadMoreBoatDays() {

	disableFormFields();

	$('.upcoming-boatdays .show-more').text("Loading..");
	$('.upcoming-boatdays .show-more').prop("disabled",true);

	var tpl = _.template(getTemplate('boatday-card'));

    var fromDate = $('input[name="date-from"]').datepicker('getDate');
   	var toDate = $('input[name="date-to"]').datepicker('getDate');
   	var category = $('select[name="category"]').val();
   	var priceArray = $('#slider-price').slider('getValue');
	//var timeArray = $('#slider-departure').slider('getValue');
	var location = $('select[name="location"]').val();

	var target = $('.upcoming-boatdays .container .row');


	var query = new Parse.Query(Parse.Object.extend('BoatDay'));
	query.include('captain');
	query.include('host');
	query.limit(queryLimit);
	query.skip(currentBoatdaysNum);
	query.equalTo('status', 'complete');
	query.greaterThanOrEqualTo('price', parseInt(priceArray[0]));
	query.lessThanOrEqualTo('price', parseInt(priceArray[1]));
	//query.greaterThanOrEqualTo('departureTime', parseFloat(timeArray[0]));
	//query.lessThanOrEqualTo('departureTime', parseFloat(timeArray[1]));
	query.ascending("date");

	var around = new Parse.GeoPoint({
		latitude: parseFloat($('select[name="location"]').find(':selected').attr('lat')),
		longitude: parseFloat($('select[name="location"]').find(':selected').attr('lng'))
	});


	if(category != "all"){
		query.equalTo('category', category);
	}

	if( fromDate != null ) {
		query.greaterThanOrEqualTo("date",fromDate);
	} else {
		query.greaterThanOrEqualTo("date", new Date());
	}

	if( toDate != null ) {
		query.lessThanOrEqualTo("date", toDate);
	}

	Parse.Config.get().then(function(config){

		if(location != "everywhere"){
			query.withinMiles("location", around, config.get('FILTER_AROUND_RADIUS'));
		}
	
		query.find().then(function(boatdays) {

			currentBoatdaysNum = boatdays.length + currentBoatdaysNum;

			if(boatdays.length > 0){
				_.each(boatdays, function(boatday){
					target.append(tpl({
						boatday: boatday,
						departureTime: departureTimeToDisplayTime(boatday.get("departureTime")),
						dateToEn: getDateToEn(new Date(boatday.get('date'))),
						location: getCityFromLocation(boatday.get('locationText'))
					}));
					var q = boatday.relation('boatdayPictures').query();
					q.ascending('order');
					q.first().then(function(fileholder) {
						if( fileholder ) {
							$('.bd-'+boatday.id+' .image').css({ backgroundImage: 'url('+fileholder.get('file').url()+')' });
						}
					});
				});
			} 

			$('.upcoming-boatdays .show-more').text("Show More");
			$('.upcoming-boatdays .show-more').prop("disabled",false);

			if(boatdays.length < queryLimit){
				$('.upcoming-boatdays .show-more').hide();
			}

		}, function(error){
			console.log(error);
		});

		enableFormFields();
	});
	
}

function submitFindBoatDay(){
	$('#find-boatday form button[type="submit"]').text("Sending...");
	$('#find-boatday form button[type="submit"]').prop("disabled",true);

	var name = $('#find-boatday form input[name="mdl-name"]').val();
	var email = $('#find-boatday form input[name="mdl-email"]').val();
	var activity = $('#find-boatday form select[name="mdl-activity"]').val();
	var location = $('#find-boatday form select[name="mdl-location"]').val();
	var price = $('#mdl-slider-price').slider('getValue');

	var BDrequest = Parse.Object.extend("BoatDayRequest");
	var bdrequest = new BDrequest();
	var data = {
		name: name,
		email: email,
		activity: activity,
		location: location,
		price: price
	};

	bdrequestSaveSuccess = function(bdrequest){
		var thankTpl = _.template(getTemplate('boatday-thank'));
		$('#find-boatday .modal-body').html(thankTpl({name: name}));		
	};

	bdrequestSaveError = function(error){
		console.log(error);
	}

	bdrequest.save(data).then(bdrequestSaveSuccess, bdrequestSaveError);
	

}

$(document).ready(function() {

	//Parse.initialize("LCn0EYL8lHOZOtAksGSdXMiHI08jHqgNOC5J0tmU", "kXeZHxlhpWhnRdtg7F0Cdc6kvuGHVtDlnSZjfxpU"); // QA
	Parse.initialize("8YpQsh2LwXpCgkmTIIncFSFALHmeaotGVDTBqyUv", "FaULY8BIForvAYZwVwqX4IAmfsyxckikiZ2NFuEp"); //HP
	
	if($('.main-swiper').length !== 0) {
		var mainSwiper = new Swiper('.main-swiper .swiper-container', {
			spaceBetween: 0,
			loop: true,
			autoplay: 2500,
			autoplayDisableOnInteraction: true,
			paginationClickable: true,
			pagination: '.main-swiper .swiper-pagination',
		});
	}

	if($('.reviews').length !== 0) {
		var reviewsSwiper = new Swiper('.reviews .swiper-container', {
			spaceBetween: 40,
			loop: true,
			autoplay: 3500,
			autoplayDisableOnInteraction: true,
			paginationClickable: true,
			pagination: '.reviews .swiper-pagination',
		});
	}

	if($('.hosts').length !== 0) {
		var reviewsSwiper = new Swiper('.hosts .swiper-container', {
			spaceBetween: 40,
			autoplay: 3500,
			autoplayDisableOnInteraction: true,
			paginationClickable: true,
			pagination: '.hosts .swiper-pagination',
			slidesPerView: 3,
		});
	}

	$('.faq a').click(function(){
		if( $(this).attr('href').match("^#") ) {
			$( $(this).attr('href') + ' .inside').show();
			scrollToAnchor($(this).attr('href'));
			return false;
		}
	});

	$('body').on('click', '.boatday-card', function(event) {
		dl($(event.currentTarget).closest('.boatday-card').attr('data-id'));	
	});

	$('body').on('click', '.bd-share', function(event) {
		event.preventDefault();
		event.stopPropagation()
		fbShare($(event.currentTarget).closest('.boatday-card').attr('data-id'));
	});

	$('body').on('click', '.show-more', function(event){
		event.preventDefault();
		loadMoreBoatDays();
	});

	$('#modal-download form').submit(function(event) {
		
		event.preventDefault();

		var form = $(event.currentTarget);
		var btn = $(event.currentTarget).find('button');

		if( btn.attr('back') ) {
			btn.removeAttr('back').text('Send Text');
			form.find('.cell').toggle();
		} else {
			btn.attr('disabled', 1).text('...');
			form.find('input').attr('disabled', 1);
			$.ajax({
				url: base_url + "lib.sms.php",
				method: 'POST',
				context : form,
				data: { 
					to: form.find('input').val()
				}
			}).done(function(data) {
				btn.removeAttr('disabled');
				form.find('input').removeAttr('disabled');
				$(this).find('.cell').toggle();
				$(this).find('.cell.msg').text(data.substring(2));
				btn.attr('back', '1').text('Back');
			});
		}
	});

	$('body').on('submit', 'form[name="find-boatday"]', function(event){
		event.preventDefault();
		submitFindBoatDay();
	});


	$('#find-boatday').on('show.bs.modal', function(){
		var thankTpl = _.template(getTemplate('boatday-find-form'));
		var formData = {
			location: $('select[name="location"]').val(),
			activity: $('select[name="category"]').val(),
			price: $('#slider-price').slider('getValue')
		};
		
		$('#find-boatday .modal-body').html(thankTpl(formData));
		
		if($('#find-boatday').length !== 0) {
			$('#mdl-slider-price').slider({tooltip: 'hide'}).on('slide', 
				function(slideEvent){
					var priceArray = $('#mdl-slider-price').slider('getValue');
					$('#find-boatday .preview-mdl-price-st').text("$"+ priceArray[0]);
					$('#find-boatday .preview-mdl-price-ed').text("$"+ priceArray[1]);
				});
		}

	});

	//youtube on modal
    var youtubeUrl = $("#boatday-intro-video").attr('src');
    
    $("#modal-youtube-video").on('hide.bs.modal', function(){
        $("#boatday-intro-video").attr('src', '');
    });
    
    $("#modal-youtube-video").on('show.bs.modal', function(){
        $("#boatday-intro-video").attr('src', youtubeUrl);
    });

    if($('.boatdays .options').length !== 0) {
	    $('input[name="date-from"]').datepicker({
			format: "mm/dd/yyyy",
			startDate: "0d",
			autoclose: true
		}).on('changeDate', loadBoatDays);
	    
	    $('input[name="date-to"]').datepicker({
			format: "mm/dd/yyyy",
			startDate: "0d",
			autoclose: true
		}).on('changeDate', loadBoatDays);

	    $('#slider-price').slider({ tooltip: 'hide' }).on('slide', function(slideEvent){
			var priceArray = $('#slider-price').slider('getValue');
			$('.preview-price').text("$"+ priceArray[0] + " - $" + priceArray[1]);
		}).on('slideStop', loadBoatDays);

	   /*
	    $('#slider-departure').slider({ tooltip: 'hide' }).on('slide', function(slideEvent){
			var timeArray = $('#slider-departure').slider('getValue');
			$('.preview-departure').text(departureTimeToDisplayTime(timeArray[0]) + " - " + departureTimeToDisplayTime(timeArray[1]));
		}).on('slideStop', loadBoatDays);
	   */

	    $('select[name="category"]').on('change', loadBoatDays);

	    $('select[name="location"]').on('change', loadBoatDays);

	    loadBoatDays();
	}

});

// Facebook Tracking
(function(d, s, id) {
	var js, fjs = d.getElementsByTagName(s)[0];
	if (d.getElementById(id)) 
		return;
	js = d.createElement(s); js.id = id;
	js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&appId=498086203544962&version=v2.0";
	fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Google Analytics
(function(i,s,o,g,r,a,m){
	i['GoogleAnalyticsObject']=r;
	i[r]=i[r] || function(){ (i[r].q=i[r].q||[]).push(arguments) } , i[r].l=1*new Date();
	a=s.createElement(o),m=s.getElementsByTagName(o)[0];
	a.async=1;
	a.src=g;
	m.parentNode.insertBefore(a,m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-51849119-1', 'auto');
ga('send', 'pageview');