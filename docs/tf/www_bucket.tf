provider "aws" {
  alias  = "region"
  region = "${var.region}"
}

resource "aws_s3_bucket" "www" {
  provider = "aws.region"
  bucket   = "dev-docs.reshuffle.com"

  website {
    index_document = "index.html"
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true

    noncurrent_version_transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      days = 366
    }
  }
}

resource "aws_s3_bucket_policy" "www" {
  provider = "aws.region"
  bucket   = "${aws_s3_bucket.www.id}"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AddPerm",
      "Principal": {
        "AWS": "*"
      },
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::dev-docs.reshuffle.com/*"
    }
  ]
}
POLICY
}
