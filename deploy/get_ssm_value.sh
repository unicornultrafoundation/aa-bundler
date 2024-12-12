#!/bin/bash

# To use just set a variable with <target_env_var>=SSM:<ssm_parameter_store_path>
# e.g. database_password=SSM:/prod/myservice/database-password
# remove current env
rm -rf ../.env

function export_key() {
    COMMAND="export $1='$2'"
    eval ${COMMAND}
    echo "$1=$2" >> ../.env
}
function read_properties() {
  file="$1"
  while IFS="=" read -r key value; do
    echo "$key=\"$value\""
    if [[ $value == *"SSM:"* ]]; then
      ssm_key="${value/SSM:/}"
      get_parameter $key $ssm_key
    else
      export_key $key $value
    fi
  done < "$file"
}


function get_parameter() {
    ENV_VAR_NAME=$1
    SSM_PARAM_NAME=$2

    echo "Getting parameter $SSM_PARAM_NAME from SSM parameter store if it exists and setting into the variable $ENV_VAR_NAME"

    SSM_VALUE=`aws ssm get-parameters --with-decryption --names "${SSM_PARAM_NAME}"  --query 'Parameters[*].Value' --output text`

    if [[ -z "$SSM_VALUE" ]]; then
        echo "Must provide $ENV_VAR_NAME in environment" 1>&2
        exit 1
    fi
    export_key $ENV_VAR_NAME $SSM_VALUE
}

filename="../$1.env"

read_properties $filename