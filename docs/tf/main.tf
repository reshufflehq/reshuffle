provider "aws" {
  region = "${var.region}"
}

data "aws_route53_zone" "reshuffle" {
  name         = "reshuffle.com."
  private_zone = false
}
