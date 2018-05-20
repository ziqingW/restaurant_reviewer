$(document).ready(function(){
    $("#add_new").click(function(e){
        e.preventDefault();
        window.location.assign("/new_restaurant");
    });
});