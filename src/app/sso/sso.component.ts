import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../services';

@Component({
  selector: 'app-sso',
  templateUrl: './sso.component.html',
  styleUrls: ['./sso.component.scss']
})
export class SsoComponent implements OnInit {

  constructor(
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,) { }

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      console.log(params)
      let loginResponse = this.authenticationService.validateAndLoginSSO(params)
      loginResponse.subscribe(response => {
        if (response['sendStatus'] == 200) {
          // const { data } = response['data']
          const { accessToken, refreshToken } = response['data']
          console.log(response['data'])
          if (accessToken && refreshToken)
            this.authenticationService.loginAndRedirect(accessToken, refreshToken)
        }

      })
      // const { text, accessToken, refreshToken } = params[]
      // if (text === 'Login Success') {
      //   this.authenticationService.loginAndRedirect(accessToken, refreshToken)
      // }

    })
  }



}
