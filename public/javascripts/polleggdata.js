$(function() {
    var intervalId = null;

    function convertUgpm3ToHexRGB(value){
        var current_ugpm3 = value;
        var min_ugpm3 = 0;
        var max_ugpm3 = 60;
        var span_ugpm3 = (max_ugpm3 - min_ugpm3);

        var ugpm3_override = $("#ugpm3_override").val().trim();
        if(ugpm3_override != ""){
            try {
                current_ugpm3 = parseFloat(ugpm3_override);
            }
            catch(e){
                console.log("failed to parse " + ugpm3_override + " as a float");
            }

        }

        if(current_ugpm3 < min_ugpm3) current_ugpm3 = min_ugpm3;
        if(current_ugpm3 > max_ugpm3) current_ugpm3 = max_ugpm3;

        var colorx_cie_min = 0.15;
        var colorx_cie_max = 0.68;
        var colorx_cie_span = (colorx_cie_max - colorx_cie_min);
        var colory_cie_min = 0.05;
        var colory_cie_max = 0.30;
        var colory_cie_span = (colory_cie_max - colory_cie_min);

        var proportion_ugpm3 = (current_ugpm3 - min_ugpm3) / span_ugpm3;

        var current_cie_x = colorx_cie_min + colorx_cie_span * proportion_ugpm3;
        var current_cie_y = colory_cie_min +  (colory_cie_span / colorx_cie_span) * (current_cie_x - colorx_cie_min);
        var current_cie_z = 1 - current_cie_x - current_cie_y;
        var brightness_Y = 0.5;

        // convert from xyY to XYZ
        var colorX = brightness_Y / current_cie_y * current_cie_x;
        var colorY = brightness_Y;
        var colorZ = brightness_Y / current_cie_y * current_cie_z;

        // convert from XYZ to sRGB
        // [R]   [ 3.2406   -1.5372   -0.4986]   [X]
        // [G] = [-0.9689    1.8758    0.0415] * [Y]
        // [B]   [ 0.0557   -0.2040    1.0570]   [Z]
        var colorLinearR =  3.2406 * colorX - 1.5372 * colorY - 0.4986 * colorZ;
        var colorLinearG = -0.9689 * colorX + 1.8758 * colorY + 0.0415 * colorZ;
        var colorLinearB =  0.0557 * colorX - 0.2040 * colorY + 1.0570 * colorZ;

        // force it into the range of 0 - 1
        if(colorLinearR < 0 ) colorLinearR = 0;
        if(colorLinearR > 1 ) colorLinearR = 1;
        if(colorLinearG < 0 ) colorLinearG = 0;
        if(colorLinearG > 1 ) colorLinearG = 1;
        if(colorLinearB < 0 ) colorLinearB = 0;
        if(colorLinearB > 1 ) colorLinearB = 1;

        // gamma correct
        var alpha = 0.055;
        colorR = colorLinearR <= 0.0031308 ? 12.92 * colorLinearR : (1 + alpha) * Math.pow(colorLinearR, 1/2.4) - alpha;
        colorG = colorLinearG <= 0.0031308 ? 12.92 * colorLinearG : (1 + alpha) * Math.pow(colorLinearG, 1/2.4) - alpha;
        colorB = colorLinearB <= 0.0031308 ? 12.92 * colorLinearB : (1 + alpha) * Math.pow(colorLinearB, 1/2.4) - alpha;

        try {
            var hexcolor = $.colorspaces.make_color('sRGB', [colorR, colorG, colorB]).as('hex');
            return hexcolor;
        }
        catch(e){
            console.log(e);
        }
        return("#FFFFFF");
    }

    var updateDataTable = function(data, textStatus, jqXHR){
        console.log(data);

        // particulate eggs only
        var egg_number = 1;
        if(data){
            for(var ii = 1; ii <= 6; ii++){
                var id = $("#egg" + ii).val().trim();
                if(data[id] && data[id].pm_avg_ugpm3){
                    var hexColor = convertUgpm3ToHexRGB(data[id].pm_avg_ugpm3);
                    $("#eggcolor" + ii).css('background-color', hexColor);
                }
                else{
                    $("#eggcolor" + ii).css('background-color', '#FFFFFF');
                }
            }
        }

    };

    $("#stop").click(function(){
        if(intervalId){
            clearInterval(intervalId);
            intervalId = null;
        }
    });

    $('#start').click(function(){
        intervalId = setInterval(function(){
            if($("#slider_override") && $("#slider_override").is( ":checked" )){
                return;
            }

            var obj= {
                serialNumbers: []
            };

            for(var ii = 1; ii <= 6; ii++) {
                if ($("#egg" + ii).val().trim() != "") {
                    obj.serialNumbers.push($("#egg" + ii).val().trim());
                }
            }

            var d = new Date();
            var isostring = d.toISOString();
            jQuery.ajax({
                'type': 'POST',
                'url': '/eggdata?rand='+ isostring,
                'contentType': 'application/json',
                'data': JSON.stringify(obj),
                'dataType': 'json',
                'success': updateDataTable
            });
        }, 5000);
    });

    $( "#slider" ).slider({
      max: 60,
      change: function(event, ui){
        var hexcolor = convertUgpm3ToHexRGB(ui.value);
        $("#eggcolor1").css('background-color', hexcolor);
      }
    });
});