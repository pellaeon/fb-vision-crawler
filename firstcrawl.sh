#!/bin/bash

filename="$1"

while read -r line; do
	read -r name finish <<< "$line"
	if [ "$finish" = "finished" ]
	then
		echo "$name is finished"
		continue
	fi
	echo "Name read from file - $name"
	timeout -k 30m 10m node facebook-naive.js -n "$name" -d 20
	if [ $? -eq 0 ]
	then
		sed -i "s/$name/$name\tfinished/" $filename
	fi
	sleep 1
done < "$filename"
