$(function () {
	ImageMapGenerator.init();
	$('.colorSelector').simpleColor({
			cellWidth: 9,
			cellHeight: 9,
			border: '1px solid #333333',
			buttonClass: 'button',
			displayColorCode: true
	});
});
var ImageMapGenerator = {};

ImageMapGenerator = {
	createCanvas : function (conf, img) {
		var canvas = '<canvas id="canvas" width="' + conf.width + '" height="' + conf.height + '"></canvas>';
		ImageMapGenerator.canvasContainer.append(canvas);
		ImageMapGenerator.mapGenerator(img);
		$('body').addClass('imageLoaded');
	},
	preloadImg: function ( src ) {
		var img = new Image();
		img.onload = function () {
			$(this).appendTo(ImageMapGenerator.canvasContainer);
			ImageMapGenerator.imageHolder.hide();
			ImageMapGenerator.createCanvas({
				width: $(this).width(),
				height: $(this).height()
			},img);
		};
		img.src = src;
		img.id = 'image';
	}
}

ImageMapGenerator.imageDragDrop = function () {
	var holder = ImageMapGenerator.imageHolder,
		attachEvents = function () {
			holder[0].addEventListener("dragenter", preventDefaultDragEvents, false);
			holder[0].addEventListener("dragexit", preventDefaultDragEvents, false);
			holder[0].addEventListener("dragover", preventDefaultDragEvents, false);
			holder[0].addEventListener("drop", dropEvent, false);
		},
		preventDefaultDragEvents = function (evt) {
			evt.stopPropagation();
			evt.preventDefault();
		},
		dropEvent = function (event) {
			event.stopPropagation();
			event.preventDefault();
			var file = event.dataTransfer.files[0],
				reader = new FileReader(),
				readFileEnd = function (e) {
					var imgSrc = e.target.result;
					ImageMapGenerator.preloadImg(imgSrc);
				};
		
			reader.onloadend = readFileEnd;
			if ( file ) {
				reader.readAsDataURL(file);
			}
		}
	attachEvents();
}

ImageMapGenerator.mapGenerator = function (imgData) {
	var canvas = document.getElementById('canvas'),
		$canvas = $(canvas),
		ctx = canvas.getContext('2d'),
		img = imgData,
		canvasOffsetX, 
		canvasOffsetY,
		enableButton = $('.enableButton'),
		closePathButton = $('.closePathButton'),
		generateButton = $('.generateButton'),
		undoButton = $('.undoButton'),
		htmlTextarea = $('#mapHtml'),
		infoFields = $('.infoFields'),
		hrefField = $('#href'),
		titleField = $('#title'),
		saveInfoButton = $('.saveInfo'),
		notification = $('.notification'),
		drawingFlag = true,
		isEditMode = false,
		area = {},
		areas = [],
		points = [],
		opacityElem = $('#opacity'),
		opacity = opacityElem.val(),
		strokeColorEl = $('#strokeCol'),
		fillColorEl = $('#fillCol'),
		strokeColor = strokeColorEl.val(),
		fillColor = fillColorEl.val(),
		pointsCount = 0,
		prevCoordX,
		prevCoordY,
		fakeCanvas = $('#fakeCanvas'),
		image = $('#image'),
		imageFake = $('#imageMap'),
		autoNumCheckbox = $('#autoNum'),
		autoNumPrefix = $('#autoPrefix'),
		closeAreaSensitivity = 4,
		isPressed = false,
		moveOffsetX,
		moveOffsetY,
		areaIndex,
		initialArr = [],
		closeArea = function () {
			if (points.length > 2) {
				saveArea();
				repaintAreas(areas);
			}
		},
		saveArea = function () {
			area.points = points;
			areas.push(area);
			area = {};
			pointsCount = 0;
			points = [];
		},
		repaintArea = function ( obj ) {
			var i = 0,
				array = obj.points,
				len = array.length;
			if (obj.lineWidth) {
				ctx.lineWidth = obj.lineWidth;
			}
			ctx.beginPath();
			ctx.moveTo(array[i].x,array[i].y);
			for(; i < len; i++) {
				//ctx.arc(array[i].x,array[i].y,3,0,Math.PI*2, true);
				ctx.lineTo(array[i].x,array[i].y);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
			ctx.lineWidth = 1;
		},
		repaintAreas = function ( array, clearCanvas ) {
			if (!clearCanvas) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
			ctx.fillStyle = fillColor;
			var i = 0,
				len = array.length;
			for (; i < len; i++) {
				repaintArea(array[i]);
			}
		},
		toggleDrawingMode = function () {
			if ( drawingFlag ) {
				drawingFlag = false;
			} else {
				drawingFlag = true;
			}
		},
		draw = function ( pageX, pageY, redraw) {
			pointsCount++;
			drawPoint( pageX , pageY );
			if ( pointsCount > 2 && !redraw && tryAutoClose( pageX , pageY )) {
					return;
			}
			if ( pointsCount >= 2 ) {
				drawLine( pageX , pageY );
			}
			savePoints( pageX , pageY );
		},
		savePoints = function ( x , y ) {
			prevCoordX = x;
			prevCoordY = y;
			points.push({
				x: x,
				y: y
			});
		},
		undo = function () {
			var newPointsArray;
			if (!areas.length && points.length) {
				points.pop();
				redrawLinesPoints(points);
			} else if (areas.length && points.length) {
				points.pop();
				redrawLinesPoints(points);
				repaintAreas(areas, true);
			} else if (areas.length && !points.length) {
				newPointsArray = areas.pop();
				redrawLinesPoints(newPointsArray.points);
				if (areas.length) {
					repaintAreas(areas, true);
				} else {
					points = newPointsArray.points;
				}
			}
			updateImageMap();
		},
		redrawLinesPoints = function ( array ) {
			var i = 0,
				len = array.length;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			pointsCount = 0;
			if (len === 0) {
				return;
			}
			prevCoordX = array[0].x;
			prevCoordY = array[0].y;
			points = [];
			for (; i < len; i++) {
				draw( array[i].x, array[i].y , true )
			}
		},
		attachEvents = function () {
			ImageMapGenerator.canvasContainer.on('mousedown', function (event) {
				event.preventDefault();
				recalc();
				draw(event.pageX - canvasOffsetX, event.pageY - canvasOffsetY);
			});
			closePathButton.click(function () {
				if (points.length) {
					closeArea();
					showInfoFields();
					clearFields();
					updateImageMap();
				}
				return false;
			});
			generateButton.click(function () {
				generateHtml();
				$('.helpText').slideDown('slow');
				return false;
			});
			saveInfoButton.click(function () {
				if (isEditMode) {
					saveAreaInfo(true);
				} else {
					saveAreaInfo();
				}
				generateHtml();
				return false;
			});
			fakeCanvas.on('mousedown', 'area' , function (event) {
				var index = $(this).index();
				fillFields(index);
				saveInfoButton.data('current', index);
				showInfoFields();
				isEditMode = true;
				isPressed = true;
				moveOffsetX = event.pageX - canvasOffsetX;
				moveOffsetY = event.pageY - canvasOffsetY;
				areaIndex = index;
				initialArr = areas[index].points;
				setSelectedStyle(index, 3);
				fakeCanvas.addClass('moving');
				entireRepaint();
				return false;
			});
			fakeCanvas.on('mousemove', function (e) {
				var index;
				if (isPressed) {
					dragRecalc(areaIndex, e.pageX - canvasOffsetX , e.pageY - canvasOffsetY);
				}
				return false;
			});
			fakeCanvas.on('mouseup' , function () {
				if (isPressed) {
					isPressed = false;
					updateImageMap();
					if (htmlTextarea.is(':visible')) {
						generateHtml();
					}
				}
				hrefField.focus();
				fakeCanvas.removeClass('moving');
				return false;
			});
			hrefField.add(titleField).add(autoPrefix).on('keyup', function (e) {
				if (e.which == '13') {
					if (isEditMode) {
						saveAreaInfo(true);
					} else {
						saveAreaInfo();
					}
					generateHtml();
				}
			});
			strokeColorEl.change(function () {
				strokeColor = $(this).val();
			});
			fillColorEl.change(function () {
				fillColor = $(this).val();
			});
			opacityElem.change(function () {
				ctx.globalAlpha = $(this).val();
			});
			undoButton.click(function () {
				undo();
				return false;
			});
			$(window).on('resize', function () {
				recalc();
			});
			autoNumCheckbox.on('change' , function () {
				if ($(this).is(':checked')) {
					autoNumPrefix.removeAttr('readonly')
								 .focus();
					hideInfoFields();
				} else {
					showInfoFields();
				}
			})
		},
		generateHtml = function () {
			htmlTextarea.fadeIn('slow')
							.val(getHtml())
							.focus();
			htmlTextarea[0].select();
		},
		drawPoint = function ( x, y ) {
			ctx.fillStyle = strokeColor;
			ctx.beginPath();
			ctx.arc(x,y,2,0,Math.PI*2, true);
			ctx.fill();
		},
		drawLine = function ( x, y ) {
			ctx.strokeStyle = strokeColor;
			ctx.beginPath();
			ctx.moveTo(prevCoordX,prevCoordY);
			ctx.lineTo(x,y);
			ctx.closePath();
			ctx.stroke();
		},
		getArea = function ( obj , number) {
			var i = 0,
				array = obj.points,
				len = array.length,
				htmlCoords = [],
				href = obj.href ? 'href="' + obj.href +'" ' : 'href="#" ',
				title = obj.title ? 'title="' + obj.title +'" ' : 'title=""';

			for(; i < len; i++) {
				htmlCoords.push(array[i].x);
				htmlCoords.push(array[i].y);
			}
			return '<area shape="poly" coords="' + htmlCoords.join(',') + '" ' + href + title + ' alt="" >';
		},
		getHtml = function () {
			var area,
				areaStr = '',
				autoNumMode = autoNumCheckbox.is(':checked'),
				prefix = '#' + autoNumPrefix.val();

			for (var i = 0, len = areas.length; i < len; i++) {
				if (autoNumMode) {
					areas[i].href = prefix + '-' + (i + 1);
					areaStr += '\t' + getArea(areas[i], i) + '\n'
				} else {
					areaStr += '\t' + getArea(areas[i], i) + '\n';
				}
			}
			return '<map name="imageMap">\n' + areaStr + '</map>';
		},
		showInfoFields = function () {
			if (!autoNumCheckbox.is(':checked')) {
				infoFields.fadeIn(200);
			}
		},
		hideInfoFields = function () {
			infoFields.fadeOut(200);
		},
		saveAreaInfo = function ( inEditMode ) {
			var areaInfo = getAreaInfo(),
				currentArea;
			if (!inEditMode) {
				currentArea = areas.length - 1;
			} else {
				currentArea = saveInfoButton.data('current');
			}
			areas[currentArea].href = areaInfo.href;
			areas[currentArea].title = areaInfo.title;
			notification.show();
			setTimeout(function () {
				notification.hide();
			},450);
		},
		getAreaInfo = function () {
			return {
				href: $.trim(hrefField.val()),
				title: $.trim(titleField.val())
			}
		},
		clearFields = function () {
			hrefField.val('');
			titleField.val('');
		},
		updateImageMap = function () {
			var mapHtml,
				map = $('#map'),
				mapHtml = getHtml();
			imageFake.css({
				width: image.width(),
				height: image.height() 
			});
			imageFake.attr('usemap', '#imageMap');
			if (!map.length) {
				map = $(mapHtml).attr('id', 'map');
				fakeCanvas.append(map)
						  .show();
			} else {
				map.replaceWith($(mapHtml).attr('id', 'map'));
				fakeCanvas.show();
			}
		},
		fillFields = function ( index ) {
			hrefField.val(areas[index].href);
			titleField.val(areas[index].title);
		},
		recalc = function () {
			canvasOffsetX = $canvas.offset().left; 
			canvasOffsetY = $canvas.offset().top;
		},
		undoKeyboardShortCut = function () {
			var ctrl = false;
			$(document).on ('keydown', function (e) {
				if (e.which == '17') {
					ctrl = true;
				} else if (ctrl && e.which =='90') {
					undo();
				} else {
					ctrl = false;
				}
			});
		},
		tryAutoClose = function ( x , y ) {
			var firstPointX = points[0].x,
				firstPointY = points[0].y,
				diffX = firstPointX - x,
				diffY = firstPointY - y,
				diff = closeAreaSensitivity;

			if ( (diffX < diff && diffX > -diff ) && (diffY < diff && diffY > -diff ) ) {
				closeArea();
				updateImageMap();
				return true;
			}
		},
		entireRepaint = function () {
			if (points.length) {
				redrawLinesPoints(points);
			}
			if (areas.length) {
				repaintAreas(areas);
			}
		},
		dragRecalc = function ( index, x, y ) {
			var arr = [],
				i = 0,
				len = initialArr.length;
				diffX = x - moveOffsetX,
				diffY = y - moveOffsetY;
			for(; i < len; i++) {
				arr[i] = {};
				arr[i].x = initialArr[i].x + diffX;
				arr[i].y = initialArr[i].y + diffY; 
			}
			
			areas[index].points = arr;
			entireRepaint();
		},
		setSelectedStyle = function (index, lineWidth) {
			for(var i = 0, len = areas.length; i < len; i++) {
				delete areas[i].lineWidth;
			}
			areas[index].lineWidth = lineWidth;
		};
	recalc();
	htmlTextarea.val('');
	updateImageMap();
	attachEvents();
	ctx.globalAlpha = opacity;
	undoKeyboardShortCut();
}

ImageMapGenerator.init = function () {
	ImageMapGenerator.canvasContainer = $('#canvasContainer');
	ImageMapGenerator.imageHolder = $('#imageZone');
	ImageMapGenerator.imageDragDrop();
}
