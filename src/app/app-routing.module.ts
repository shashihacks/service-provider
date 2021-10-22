import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { DataComponent } from './data/data.component';
import { AuthGuard } from './helpers';
import { HomeComponent } from './home/home.component';
import { LoginWithPufComponent } from './login-with-puf/login-with-puf.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { SsoComponent } from './sso/sso.component';

const routes: Routes = [
  { path: '', component: AppComponent, },
  { path: 'login', component: LoginComponent, },
  { path: 'login-with-puf', component: LoginWithPufComponent, },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, },
  { path: 'data', component: DataComponent, canActivate: [AuthGuard] },
  { path: 'sso/:firstName/:lastName/:email/:HMAC', component: SsoComponent, },

  { path: 'sso', component: SsoComponent, },



  // { path: 'via_idp/:id', component: IdpComponent, },



  // otherwise redirect to home
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
