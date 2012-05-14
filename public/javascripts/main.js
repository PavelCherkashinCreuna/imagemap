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

			ctx.beginPath();
			ctx.moveTo(array[i].x,array[i].y);
			for(; i < len; i++) {
				//ctx.arc(array[i].x,array[i].y,3,0,Math.PI*2, true);
				ctx.lineTo(array[i].x,array[i].y);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
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
		draw = function ( pageX, pageY) {
			var coordX = pageX - canvasOffsetX,
				coordY = pageY - canvasOffsetY,
				firstPointX,
				firstPointY,
				diff = 5,
				diffX,
				diffY;

			if ( pointsCount > 2 ) {
				firstPointX = points[0].x;
				firstPointY = points[0].y;
				diffX = firstPointX - coordX;
				diffY = firstPointY - coordY;
				if ( (diffX < diff && diffX > -diff ) && (diffY < diff && diffY > -diff ) ) {
					//areas.push({points: points});
					closeArea();
					toggleEditMapMode();
					return;
				}
			}
			pointsCount++;
			drawPoint( coordX, coordY );
			if ( pointsCount >= 2 ) {
				drawLine( coordX, coordY );
			}
			prevCoordX = coordX;
			prevCoordY = coordY;
			points.push({
				x: coordX,
				y: coordY
			});
		},
		undo = function () {
			var newPointsArray;
			if (!areas.length && points.length) {
				points.pop();
				redraw(points);
			} else if (areas.length && points.length) {
				points.pop();
				redraw(points);
				repaintAreas(areas, true);
			} else if (areas.length && !points.length) {
				newPointsArray = areas.pop();
				redraw(newPointsArray.points);
				if (areas.length > 2) {
					repaintAreas(areas, true);
				} else {
					points = newPointsArray.points;
				}
			}
			toggleEditMapMode();
		},
		redraw = function ( array ) {
			var i = 0,
				len = array.length;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			if (len === 0) {
				pointsCount = 0;
				return;
			}
			prevCoordX = array[0].x;
			prevCoordY = array[0].y;
			pointsCount = 0;
			for (; i < len; i++) {
				pointsCount++;
				drawPoint( array[i].x, array[i].y );
				if ( pointsCount >= 2 ) {
					drawLine( array[i].x, array[i].y );
				}
			}
		},
		attachEvents = function () {
			ImageMapGenerator.canvasContainer.on('mousedown', function (event) {
				event.preventDefault();
				draw(event.pageX, event.pageY);
			});
			closePathButton.click(function () {
				if (points.length) {
					closeArea();
					showInfoFields();
					clearFields();
					toggleEditMapMode();
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
			$('#fakeCanvas').on('mousedown', 'area' , function () {
				var index = $(this).index();
				fillFields(index);
				saveInfoButton.data('current', index);
				showInfoFields();
				hrefField.focus();
				isEditMode = true;
				return false;
			});
			hrefField.add(titleField).on('keyup', function (e) {
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
			prevCoordX = x;
			prevCoordY = y; 
		},
		getArea = function ( obj ) {
			var i = 0,
				array = obj.points,
				len = array.length,
				htmlCoords = [],
				href = obj.href ? 'href="' + obj.href +'" ' : '',
				title = obj.title ? 'title="' + obj.title +'" ' : '';
			for(; i < len; i++) {
				htmlCoords.push(array[i].x);
				htmlCoords.push(array[i].y);
			}
			return '<area shape="poly" coords="' + htmlCoords.join(',') + '" ' + href + title + '>';
		},
		getHtml = function () {
			var area,
				areaStr = '';
			for (var i = 0, len = areas.length; i < len; i++) {
				areaStr += '\t' + getArea(areas[i]) + '\n';
			}
			return '<map name="imageMap">\n' + areaStr + '</map>';
		},
		showInfoFields = function () {
			infoFields.fadeIn(200);
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
		toggleEditMapMode = function () {
			var mapHtml,
				map = $('#map');
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
		};
	recalc();
	htmlTextarea.val('');
	toggleEditMapMode();
	attachEvents();
	ctx.globalAlpha = opacity;
}

ImageMapGenerator.init = function () {
	ImageMapGenerator.canvasContainer = $('#canvasContainer');
	ImageMapGenerator.imageHolder = $('#imageZone');
	ImageMapGenerator.imageDragDrop();
}