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
	node facebook-naive.js -n "$name" -d 20
	sed -i "s/$name/$name\tfinished/" $filename
	sleep 1
done < "$filename"
