import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss']
})
export class DataComponent implements OnInit {

  user = {}
  constructor(private route: ActivatedRoute, private router: Router,
    @Inject(DOCUMENT) private document: Document) {

    this.route.queryParams.subscribe(params => {
      console.log(params)
      this.user = params
    })
    // this.user['name'] = 


  }

  login() {
    this.document.location.href = "http://localhost:4200/via_client?clientId=1234567890&redirectUrl=http://127.0.0.1:4000/data"

  }

  ngOnInit(): void {
  }

}
