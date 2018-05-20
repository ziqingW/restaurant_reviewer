$(document).ready(function(){
    
    function makeStars(stars) {
        var rating = '<i class="fas fa-star"></i>'.repeat(Math.floor(stars));
        if (stars % 1 != 0) {
        rating += '<i class="fas fa-star-half"></i>';
        }
        return rating;   
    }
    $("#stars").html(makeStars($("#stars").data()['stars']));
    $(".review-star").each(function(i) {
        $(this).html(makeStars($(this).data()['reviewerstars']));
    });
    $("#new-review").click(function(){
        $(".new-review-background").css('display', 'flex');
    });
    $("#cancel").click(function(e){
        e.preventDefault();
        $(".new-review-background").css('display', 'none');
    })
});