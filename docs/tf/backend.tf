terraform {
  backend "s3" {
    bucket         = "shared-tf-state.binaris"
    region         = "us-east-1"
    dynamodb_table = "Terraform-Lock-Table"
  }
}
