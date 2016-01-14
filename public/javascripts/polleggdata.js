$(function() {
    var intervalId = null;

    var updateDataTable = function(data, textStatus, jqXHR){
        console.log(data);

        // particulate eggs only
        var egg_number = 1;
        if(data){
            for(var ii = 1; ii <= 6; ii++){
                var id = $("#egg" + ii).val().trim();
                if(data[id] && data[id].pm_avg_ugpm3){
                    var current_ugpm3 = data[id].pm_avg_ugpm3;
                    var min_ugpm3 = 0;
                    var max_ugpm3 = 60;
                    var span_ugpm3 = (max_ugpm3 - min_ugpm3);

                    if(current_ugpm3 < min_ugpm3) current_ugpm3 = min_ugpm3;
                    if(current_ugpm3 > max_ugpm3) current_ugpm3 = max_ugpm3;

                    /*
                    var colorx_cie_min = 0.15;
                    var colorx_cie_max = 0.68;
                    var colorx_cie_span = (colorx_cie_max - colorx_cie_min);
                    var colory_cie_min = 0.05;
                    var colory_cie_max = 0.30;
                    var colory_cie_span = (colory_cie_max - colory_cie_min);

                    var proportion_ugpm3 = (max_ugpm3 - current_ugpm3) / span_ugpm3;

                    var current_cie_x = colorx_cie_min + colorx_cie_span * proportion_ugpm3;
                    var current_cie_y = colory_cie_min +  (colory_cie_span / colorx_cie_span) * (current_cie_x - colorx_cie_min);
                    var current_cie_z = 1 - current_cie_x - current_cie_y;

                    var conv = $.colorspaces.converter('CIExyY', 'hex');
                    var hexcolor = conv([current_cie_x, current_cie_y, 0.5]); //50% brightness
                    */

                    var hexcolor = '#0000FF';
                    if(current_ugpm3 > 30){
                        hexcolor = '#FF0000';
                    }

                    $("#eggcolor" + ii).css('background-color', hexcolor);
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
});