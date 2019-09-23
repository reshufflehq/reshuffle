data "aws_acm_certificate" "reshuffle-com" {
  domain   = "reshuffle.com"
  statuses = ["ISSUED"]
}

resource "aws_cloudfront_distribution" "dev_docs" {
  depends_on = ["aws_s3_bucket.www"]

  origin {
    domain_name = "${aws_s3_bucket.www.website_endpoint}"
    origin_id   = "dev_docs_s3_origin"

    custom_origin_config {
      origin_protocol_policy = "http-only"
      http_port              = "80"
      https_port             = "443"
      origin_ssl_protocols   = ["TLSv1"]
    }
  }

  enabled             = true
  default_root_object = "index.html"
  aliases             = ["dev-docs.reshuffle.com"]
  price_class         = "PriceClass_200"
  retain_on_delete    = true

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "dev_docs_s3_origin"

    compress = true

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 86400
  }

  viewer_certificate {
    acm_certificate_arn      = "${data.aws_acm_certificate.reshuffle-com.arn}"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_route53_record" "dev_docs" {
  zone_id = "${data.aws_route53_zone.reshuffle.zone_id}"
  name    = "dev-docs"
  type    = "A"

  alias {
    name                   = "${aws_cloudfront_distribution.dev_docs.domain_name}"
    zone_id                = "${aws_cloudfront_distribution.dev_docs.hosted_zone_id}"
    evaluate_target_health = false
  }
}
